# analyze.py — pulls real numbers directly from SEC filings
# Drop this into your kerno folder, replacing the existing analyze.py

import os
import re
import json
import logging
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger("kerno.analyze")

# ── Config ──────────────────────────────────────────────────────────────────
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "models/gemini-3.5-flash")

if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
else:
    raise RuntimeError(
        "GOOGLE_API_KEY not found. "
        "Make sure your .env file contains GOOGLE_API_KEY=your_key_here"
    )




# ── Number extractor ────────────────────────────────────────────────────────
def extract_financials(text: str) -> str:
    """
    Pre-process the raw filing text to pull out the most number-dense
    sections before sending to Gemini. This dramatically improves
    accuracy because Gemini sees the actual figures, not prose.
    """
    if not text:
        return ""

    lines = text.split("\n")
    scored = []

    for line in lines:
        line = line.strip()
        if not line or len(line) < 10:
            continue

        score = 0

        # Lines with dollar amounts
        if re.search(r'\$[\d,]+', line):
            score += 3
        # Lines with numbers (could be millions/billions)
        if re.search(r'\b\d{1,3}(?:,\d{3})+\b', line):
            score += 2
        # Lines with percentages
        if re.search(r'\d+\.?\d*\s*%', line):
            score += 2
        # Financial keywords
        keywords = [
            'revenue', 'income', 'earnings', 'margin', 'profit', 'loss',
            'cash', 'operating', 'net', 'gross', 'diluted', 'eps',
            'quarter', 'year', 'growth', 'increase', 'decrease',
            'guidance', 'outlook', 'forecast', 'expect', 'billion', 'million'
        ]
        for kw in keywords:
            if kw in line.lower():
                score += 1

        if score >= 3:
            scored.append((score, line))

    # Sort by score descending, take the top lines
    scored.sort(key=lambda x: x[0], reverse=True)
    top_lines = [line for _, line in scored[:80]]

    # Return in original order (re-sort by position)
    result = []
    for line in lines:
        if line.strip() in top_lines:
            result.append(line.strip())

    return "\n".join(result[:80])


# ── Prompt ──────────────────────────────────────────────────────────────────
def build_prompt(company: dict) -> str:
    filing_text = company.get("filing_text", "").strip()

    if filing_text and len(filing_text) > 500:
        context = f"""Here is extracted text from the actual {company['form']} filing dated {company['date']}.
Use the specific numbers you find here. Where the filing text is incomplete,
supplement with your knowledge of this company's recent financials.

--- FILING EXTRACT ---
{filing_text[:12000]}
--- END EXTRACT ---"""
    else:
        context = f"""The SEC filing text could not be extracted fully.
Use your knowledge of {company['name']} ({company['ticker']}) and their most recently
reported quarter as of {company['date']} to provide accurate figures."""

    return f"""You are a senior equity research analyst at a top-tier investment bank.
You write clear, opinionated analysis that investors can actually act on.

Company: {company['name']} (ticker: {company['ticker']})
Filing: {company['form']} dated {company['date']}

{context}

Your job:
- Pull out the most important financial metrics (revenue, net income, margins, EPS, key segments)
- Give real numbers — never write "not disclosed" if you know the figure from your training
- Write an opinionated bottom line with a specific bull case and key risk
- management_tone should reflect how executives actually talked about the quarter
- risks should be specific to THIS company and quarter, not generic boilerplate
- Be direct and confident. Investors want your view, not hedged nothing-statements.

Return ONLY this JSON object. No markdown, no fences, no text outside the braces.

{{
  "three_second_take": "One sharp sentence: what matters most this quarter and what it means for investors",
  "metric1_label": "Revenue",
  "metric1_value": "e.g. $90.2B",
  "metric1_change": "e.g. +12% YoY",
  "metric1_dir": "up",
  "metric2_label": "Net Income",
  "metric2_value": "e.g. $26.3B",
  "metric2_change": "e.g. +28% YoY",
  "metric2_dir": "up",
  "metric3_label": "Operating Margin",
  "metric3_value": "e.g. 34%",
  "metric3_change": "e.g. +4pp YoY",
  "metric3_dir": "up",
  "key_signals": [
    "Signal with a specific number — e.g. Google Cloud grew 28% to $12.3B",
    "Signal — e.g. YouTube ad revenue hit $8.9B, up 21%",
    "Signal — e.g. Opex grew only 5% vs 12% revenue growth showing leverage",
    "Signal — e.g. $70B buyback announced"
  ],
  "management_tone": [
    "How management described the quarter with specific language",
    "Forward guidance or outlook language"
  ],
  "risks": [
    "Specific risk with a number or timeframe",
    "Second specific risk"
  ],
  "bottom_line": "Bull case: [specific reason with number]. Key risk: [specific concern]."
}}
"""

# ── JSON repair ─────────────────────────────────────────────────────────────
def repair_json(raw: str) -> dict:
    start = raw.find("{")
    if start == -1:
        raise ValueError("No JSON object in Gemini response")
    raw = raw[start:]

    for attempt in [raw, raw + "}", raw + '"]}']:
        try:
            return json.loads(attempt)
        except json.JSONDecodeError:
            pass

    # Regex fallback
    result = {}
    for m in re.finditer(r'"(\w+)"\s*:\s*"([^"]*)"', raw):
        result[m.group(1)] = m.group(2)
    for m in re.finditer(r'"(\w+)"\s*:\s*\[([^\]]*)\]', raw):
        result[m.group(1)] = re.findall(r'"([^"]*)"', m.group(2))

    if len(result) >= 4:
        log.warning("Used regex fallback to parse Gemini response")
        return result

    raise ValueError(f"Could not parse response. Raw (first 300 chars): {raw[:300]}")


# ── Sanitizer ───────────────────────────────────────────────────────────────
def sanitize(value):
    if isinstance(value, str):
        return re.sub(r"<[^>]+>", "", value).strip()
    if isinstance(value, list):
        return [sanitize(i) for i in value]
    return value


# ── Main ─────────────────────────────────────────────────────────────────────
def analyze(company: dict) -> dict:
    """
    Takes a company dict from data.lookup_company() and returns
    a structured analysis dict with figures sourced from the actual filing.
    Raises RuntimeError on failure.
    """
    if not isinstance(company, dict):
        raise RuntimeError("Invalid company data passed to analyze()")
    if "error" in company:
        raise RuntimeError(f"Company lookup failed: {company['error']}")
    if not company.get("ticker"):
        raise RuntimeError("Company data missing ticker field")

    ticker = company["ticker"]
    has_text = bool(company.get("filing_text"))
    log.info(f"Analyzing {ticker} — filing text available: {has_text}")

    try:
        model = genai.GenerativeModel(
            GEMINI_MODEL,
            generation_config=genai.GenerationConfig(
                temperature=0,        # fully deterministic
                max_output_tokens=8192,
            )
        )

        prompt   = build_prompt(company)
        response = model.generate_content(prompt)
        raw      = response.text.strip()

        # Strip markdown fences if present
        raw = re.sub(r"```json?", "", raw).replace("```", "").strip()

        result = repair_json(raw)

        # Sanitize all output fields
        clean = {k: sanitize(v) for k, v in result.items()}

        # Tag whether this came from real filing data or training knowledge
        clean["sourced_from_filing"] = has_text

        return clean

    except RuntimeError:
        raise
    except Exception as e:
        log.error(f"Gemini error for {ticker}: {e}")
        raise RuntimeError(
            f"AI analysis failed: {str(e)}\n\n"
            "Check that GOOGLE_API_KEY is correct in your .env file."
        )
