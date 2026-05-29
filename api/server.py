"""
Kerno Analytics — hardened API server
--------------------------------------
Serves the static frontend + REST API backed by SEC EDGAR + Google Gemini.

Run:
    cd kerno-merged
    python api/server.py

Then open http://localhost:8000
API docs at http://localhost:8000/api/docs
"""

import os
import re
import sys
import logging
import traceback
from pathlib import Path

# ── Path setup ────────────────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent))

# ── Env ───────────────────────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv()

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(name)s  %(message)s",
)
log = logging.getLogger("kerno.server")

# ── Gemini ────────────────────────────────────────────────────────────────────
import google.generativeai as genai

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "models/gemini-1.5-flash")

if not GOOGLE_API_KEY:
    raise RuntimeError(
        "GOOGLE_API_KEY not set.\n"
        "Add it to your .env file:\n"
        "  GOOGLE_API_KEY=your_key_here\n"
        "Get a free key at https://aistudio.google.com/app/apikey"
    )

genai.configure(api_key=GOOGLE_API_KEY)

# ── FastAPI + rate limiter ────────────────────────────────────────────────────
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
import uvicorn

from data import lookup_company
from analyze import analyze

# ── Config ────────────────────────────────────────────────────────────────────
STATIC_DIR      = Path(__file__).parent.parent
TICKER_RE       = re.compile(r"^[A-Z]{1,6}$")
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:8000").split(",")
    if o.strip()
]

MAX_TICKERS_PER_SCAN = 10
MAX_CAPITAL          = 10_000_000
MIN_CAPITAL          = 100

# ── App ───────────────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/hour"])
app     = FastAPI(
    title       = "Kerno Analytics API",
    version     = "1.0.0",
    docs_url    = "/api/docs",
    redoc_url   = None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ALLOWED_ORIGINS,
    allow_methods     = ["GET", "POST"],
    allow_headers     = ["Content-Type"],
    allow_credentials = False,
)

# ── Security headers ──────────────────────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    h = response.headers
    h["X-Content-Type-Options"]  = "nosniff"
    h["X-Frame-Options"]          = "DENY"
    h["Referrer-Policy"]          = "strict-origin-when-cross-origin"
    h["Permissions-Policy"]       = "geolocation=(), microphone=(), camera=()"
    h["X-XSS-Protection"]         = "1; mode=block"
    h["Content-Security-Policy"]  = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://js.stripe.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src https://fonts.gstatic.com; "
        "connect-src 'self' https://api.stripe.com; "
        "frame-src https://js.stripe.com; "
        "img-src 'self' data:; "
        "object-src 'none';"
    )
    # Remove headers that leak server info
    if "X-Powered-By" in h: del h["X-Powered-By"]
    if "Server" in h: del h["Server"]
    return response

# ── Global error handler — never leak internals ───────────────────────────────
@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    log.error("Unhandled exception on %s:\n%s", request.url.path, traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again."},
    )

# ── Input helpers ─────────────────────────────────────────────────────────────
def validate_ticker(raw: str) -> str:
    """Uppercase, strip, regex-check. Raises 422 on bad input."""
    t = raw.upper().strip()[:6]
    if not TICKER_RE.match(t):
        raise HTTPException(status_code=422, detail="Invalid ticker — must be 1-6 letters only.")
    return t

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    """Liveness check — no auth, no rate limit."""
    return {"ok": True, "service": "kerno-analytics-api"}


@app.get("/api/analyze")
@limiter.limit("10/minute")
def analyze_ticker(
    request: Request,
    ticker: str = Query(..., min_length=1, max_length=6, description="Stock ticker e.g. AAPL"),
):
    """
    Full pipeline: validate → SEC EDGAR lookup → filing text → Gemini analysis.
    Rate limited to 10 requests per minute per IP.
    """
    t = validate_ticker(ticker)
    log.info("Analyze request: %s from %s", t, request.client.host)

    company = lookup_company(t)
    if "error" in company:
        raise HTTPException(status_code=404, detail=company["error"])

    try:
        result = analyze(company)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return {
        "ticker":     company["ticker"],
        "name":       company["name"],
        "form":       company["form"],
        "date":       company["date"],
        "viewer_url": company["viewer_url"],
        **result,
    }


@app.post("/api/signals")
@limiter.limit("5/minute")
async def scan_signals(request: Request, payload: dict):
    """
    Signal Scanner — Gemini-powered, same key as the analysis page.
    Body: { "tickers": ["AAPL", "NVDA"], "capital": 10000 }
    Returns: { "text": "<raw JSON array>" }
    Rate limited to 5 requests per minute per IP.
    """
    # Validate and sanitize tickers
    raw_tickers = payload.get("tickers", [])
    if not isinstance(raw_tickers, list):
        raise HTTPException(status_code=400, detail="'tickers' must be an array.")

    tickers = []
    for t in raw_tickers[:MAX_TICKERS_PER_SCAN]:
        cleaned = re.sub(r"[^A-Za-z]", "", str(t)).upper()[:6]
        if TICKER_RE.match(cleaned):
            tickers.append(cleaned)

    if not tickers:
        raise HTTPException(status_code=400, detail="No valid tickers provided.")
    if len(tickers) > MAX_TICKERS_PER_SCAN:
        raise HTTPException(status_code=400, detail=f"Max {MAX_TICKERS_PER_SCAN} tickers per scan.")

    # Clamp capital to sane range
    try:
        capital = float(payload.get("capital", 10000))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="'capital' must be a number.")
    capital = min(max(capital, MIN_CAPITAL), MAX_CAPITAL)

    log.info("Signal scan: %s | capital=$%s from %s", tickers, capital, request.client.host)

    prompt = (
        "You are a senior portfolio manager with 20 years of experience at a "
        "multi-strategy hedge fund. Analyse these tickers and produce investment signals. "
        "Consider momentum, technical levels, sector trends, and macro context.\n\n"
        f"Tickers: {', '.join(tickers)}\n"
        f"Available capital: ${capital:,.0f}\n\n"
        "Return ONLY a JSON array — no markdown, no fences, no text before or after. "
        "Each object must have exactly these fields:\n"
        '{"ticker":"AAPL","company":"Apple Inc.","signal":"BUY","price":193.42,'
        '"change_pct":1.2,"alloc_pct":18,'
        '"indicators":["RSI 58 neutral","MACD bullish cross","Above 200-day MA"],'
        '"indicator_dirs":["neu","up","up"],'
        '"rationale":"One to two sentences as a senior analyst."}\n\n'
        "Rules:\n"
        "- signal: exactly STRONG_BUY, BUY, HOLD, or SELL\n"
        "- price: realistic current market price\n"
        "- change_pct: realistic today % move, positive or negative\n"
        "- alloc_pct: STRONG_BUY 20-40%, BUY 8-20%, HOLD 0-5%, SELL 0%. Total ≤ 90%\n"
        "- indicators: exactly 3 strings under 30 chars each\n"
        "- indicator_dirs: exactly 3 strings — 'up', 'down', or 'neu'\n"
        "- rationale: under 180 chars, specific and analytical\n"
        "- Vary signals — not everything can be a buy\n\n"
        "Return the array now."
    )

    try:
        model = genai.GenerativeModel(
            GEMINI_MODEL,
            generation_config=genai.GenerationConfig(
                temperature=0.2,
                max_output_tokens=1500,
            ),
        )
        response = model.generate_content(prompt)
        raw = response.text.strip().replace("```json", "").replace("```", "").strip()
        return {"text": raw}

    except Exception as e:
        log.error("Gemini signal scan error: %s", e)
        raise HTTPException(status_code=502, detail="AI analysis failed. Please try again.")


@app.get("/api/lookup")
@limiter.limit("20/minute")
def lookup_ticker(
    request: Request,
    ticker: str = Query(..., min_length=1, max_length=6),
):
    """SEC metadata only — no AI. Used for quick validation."""
    t = validate_ticker(ticker)
    company = lookup_company(t)
    if "error" in company:
        raise HTTPException(status_code=404, detail=company["error"])
    company.pop("filing_text", None)  # never send raw filing text to client
    return company


# ── Static frontend ───────────────────────────────────────────────────────────
for sub in ("css", "js", "components"):
    sub_path = STATIC_DIR / sub
    if sub_path.is_dir():
        app.mount(f"/{sub}", StaticFiles(directory=str(sub_path)), name=sub)

HTML_PAGES = [
    "index.html", "analysis.html", "signals.html",
    "about.html", "pricing.html", "account.html",
    "checkout.html", "success.html",
]

for page in HTML_PAGES:
    page_path = STATIC_DIR / page
    def _make_route(p: Path):
        async def _serve():
            return FileResponse(str(p))
        return _serve
    route = "/" if page == "index.html" else f"/{page}"
    app.add_api_route(route, _make_route(page_path), methods=["GET"], include_in_schema=False)

@app.get("/{full_path:path}", include_in_schema=False)
async def catch_all(full_path: str):
    candidate = STATIC_DIR / full_path
    if candidate.is_file() and candidate.suffix in {".html", ".css", ".js", ".ico", ".png", ".svg", ".woff2"}:
        return FileResponse(str(candidate))
    return FileResponse(str(STATIC_DIR / "index.html"))


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    log.info("  Kerno Analytics  →  http://localhost:%s", port)
    log.info("  API docs         →  http://localhost:%s/api/docs", port)
    log.info("  Allowed origins  →  %s", ALLOWED_ORIGINS)
    log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    uvicorn.run(
        "server:app",
        host      = "0.0.0.0",
        port      = port,
        reload    = True,
        app_dir   = str(Path(__file__).parent),
        log_level = "info",
    )
