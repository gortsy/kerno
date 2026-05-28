# Kerno Analytics

AI-powered financial research — real SEC filings, real Gemini analysis, a polished frontend.

## What's inside

```
kerno-merged/
├── api/
│   ├── server.py      ← FastAPI backend (run this)
│   ├── data.py        ← SEC EDGAR fetcher & filing text extractor
│   └── analyze.py     ← Google Gemini analysis engine
├── css/               ← Kerno design system stylesheets
├── js/                ← Frontend JS (analysis, signals, interactions)
├── *.html             ← All site pages
├── requirements.txt   ← Python dependencies
└── .env.example       ← Copy to .env and fill in your keys
```

## Quick start

### 1. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2. Add your API key

```bash
cp .env.example .env
# Open .env and set GOOGLE_API_KEY=your_key_here
# Get a free key at https://aistudio.google.com/app/apikey
```

### 3. Run the server

```bash
python api/server.py
```

Open **http://localhost:8000** — that's it.

---

## Pages

| Page | URL | What it does |
|------|-----|-------------|
| Home | `/` | Landing page with feature overview |
| Analysis | `/analysis.html` | Live SEC filing analysis via Gemini |
| Signal Scanner | `/signals.html` | AI watchlist scanner with capital allocation |
| Pricing | `/pricing.html` | Plan comparison |
| About | `/about.html` | About Kerno |

## API endpoints

The Python server exposes these REST endpoints the frontend calls automatically:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Liveness check |
| GET | `/api/analyze?ticker=AAPL` | Full SEC + Gemini analysis |
| GET | `/api/lookup?ticker=AAPL` | SEC metadata only (no AI) |
| GET | `/api/docs` | Interactive API docs (Swagger) |

## How the analysis pipeline works

```
Browser types ticker
       ↓
GET /api/analyze?ticker=AAPL
       ↓
api/data.py — validates ticker → hits SEC EDGAR → fetches real 10-K/10-Q text
       ↓
api/analyze.py — extracts financial sections → sends to Gemini → parses JSON
       ↓
JSON response → frontend renders card with metrics, signals, risks, bottom line
```

## Signal Scanner

The Signal Scanner (`/signals.html`) calls the **Anthropic API directly from the browser** — no Python required for that page. It acts as a senior portfolio analyst, scanning your watchlist and recommending capital allocation percentages per signal.

To use it, the Claude API must be reachable from your browser (it is when running on claude.ai). In a standalone deployment, route it through a proxy endpoint in `api/server.py`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | ✅ Yes | Gemini API key |
| `GEMINI_MODEL` | No | Model name (default: `models/gemini-1.5-flash`) |
| `PORT` | No | Server port (default: `8000`) |
| `STRIPE_SECRET_KEY` | No | Only for checkout flow |

## Offline fallback

If the Python server is not running, the Analysis page falls back to the static demo data bundled in `js/data.js`. A toast notification tells the user the API is offline.

## Built by

Grant Stubblefield · Oregon State University · 2026  
Not financial advice. Always do your own research.
