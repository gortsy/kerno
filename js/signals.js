/**
 * Kerno Analytics — Signal Scanner
 *
 * Uses the Anthropic API (claude-sonnet) as a senior portfolio analyst.
 * Renders signal cards that match the Kerno component design system.
 */
(function initSignals() {
  /* ── Config ──────────────────────────────────────────────────────── */

  const TICKER_OPTIONS = [
    { id: "aapl",  ticker: "AAPL",  company: "Apple Inc." },
    { id: "nvda",  ticker: "NVDA",  company: "NVIDIA Corp." },
    { id: "msft",  ticker: "MSFT",  company: "Microsoft Corp." },
    { id: "tsla",  ticker: "TSLA",  company: "Tesla Inc." },
    { id: "amzn",  ticker: "AMZN",  company: "Amazon.com" },
    { id: "meta",  ticker: "META",  company: "Meta Platforms" },
    { id: "googl", ticker: "GOOGL", company: "Alphabet Inc." },
    { id: "amd",   ticker: "AMD",   company: "Advanced Micro Devices" },
    { id: "pltr",  ticker: "PLTR",  company: "Palantir Technologies" },
    { id: "spy",   ticker: "SPY",   company: "S&P 500 ETF" },
  ];

  /* ── State ───────────────────────────────────────────────────────── */

  let selected = new Set(["aapl", "nvda", "tsla", "meta"]);
  let autoTimer = null;
  let scanning  = false;

  /* ── DOM refs ────────────────────────────────────────────────────── */

  const gridEl      = document.getElementById("signals-grid");
  const summaryEl   = document.getElementById("signals-summary");
  const emptyEl     = document.getElementById("signals-empty");
  const statusDot   = document.getElementById("status-dot");
  const statusText  = document.getElementById("status-text");
  const scanBtn     = document.getElementById("scan-btn");
  const capitalIn   = document.getElementById("capital-input");
  const autoToggle  = document.getElementById("auto-scan-toggle");
  const tickerGrid  = document.getElementById("signals-ticker-grid");

  const sumBuy       = document.getElementById("sum-buy");
  const sumSell      = document.getElementById("sum-sell");
  const sumHold      = document.getElementById("sum-hold");
  const sumCapital   = document.getElementById("sum-capital");
  const sumRemaining = document.getElementById("sum-remaining");

  if (!gridEl) return;

  /* ── Build ticker picker ─────────────────────────────────────────── */

  function buildTickerGrid() {
    if (!tickerGrid) return;
    tickerGrid.innerHTML = TICKER_OPTIONS.map(t => `
      <button
        type="button"
        class="signals-ticker-btn${selected.has(t.id) ? " is-selected" : ""}"
        data-ticker-id="${t.id}"
        aria-pressed="${selected.has(t.id) ? "true" : "false"}"
        title="${escapeHtml(t.company)}"
      >${escapeHtml(t.ticker)}</button>
    `).join("");

    tickerGrid.querySelectorAll(".signals-ticker-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-ticker-id");
        if (selected.has(id)) {
          selected.delete(id);
          btn.classList.remove("is-selected");
          btn.setAttribute("aria-pressed", "false");
        } else {
          selected.add(id);
          btn.classList.add("is-selected");
          btn.setAttribute("aria-pressed", "true");
        }
      });
    });
  }

  /* ── Status helpers ──────────────────────────────────────────────── */

  function setStatus(msg, active) {
    if (statusText) statusText.textContent = msg;
    if (statusDot) {
      statusDot.className = "signals-status__dot " +
        (active ? "signals-status__dot--active" : "signals-status__dot--idle");
    }
  }

  /* ── Skeleton loading cards ──────────────────────────────────────── */

  function showSkeletons(count) {
    if (emptyEl) emptyEl.remove();
    gridEl.innerHTML = Array.from({ length: count }, () => `
      <div class="signal-card signal-card--skeleton" aria-hidden="true">
        <div class="signal-card__header">
          <div class="signal-card__name">
            <div class="skeleton-line" style="width:3rem;height:1.125rem;margin-bottom:6px"></div>
            <div class="skeleton-line" style="width:8rem;height:0.75rem"></div>
          </div>
          <div class="skeleton-line" style="width:5rem;height:1.5rem;border-radius:var(--radius-md)"></div>
        </div>
        <div style="padding:0 var(--space-xl) var(--space-md)">
          <div class="skeleton-line" style="height:4rem;border-radius:var(--radius-md);margin-bottom:var(--space-md)"></div>
          <div class="skeleton-line" style="height:5px;border-radius:999px;margin-bottom:var(--space-md)"></div>
          <div style="display:flex;gap:6px">
            <div class="skeleton-line" style="width:5rem;height:1.2rem;border-radius:var(--radius-sm)"></div>
            <div class="skeleton-line" style="width:5rem;height:1.2rem;border-radius:var(--radius-sm)"></div>
            <div class="skeleton-line" style="width:4rem;height:1.2rem;border-radius:var(--radius-sm)"></div>
          </div>
        </div>
        <div style="margin:0 var(--space-xl);padding:var(--space-md) 0;border-top:1px solid var(--kerno-grey-200)">
          <div class="skeleton-line" style="height:0.875rem;margin-bottom:6px"></div>
          <div class="skeleton-line" style="height:0.875rem;width:80%"></div>
        </div>
      </div>
    `).join("");
  }

  /* ── Main scan function ──────────────────────────────────────────── */

  async function runScan() {
    if (scanning) return;

    const tickers = TICKER_OPTIONS.filter(t => selected.has(t.id));
    if (!tickers.length) {
      setStatus("Select at least one ticker to scan.", false);
      if (window.kernoToast) window.kernoToast("Select at least one ticker first.");
      return;
    }

    const capital = Math.max(100, parseFloat(capitalIn?.value || "10000") || 10000);
    const now     = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    scanning = true;
    scanBtn.disabled = true;
    setStatus(`Scanning ${tickers.map(t => t.ticker).join(", ")}…`, true);
    showSkeletons(tickers.length);
    summaryEl.hidden = true;

    const prompt = buildPrompt(tickers, capital);

    try {
      const res  = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers: tickers.map(t => t.ticker), capital }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      const raw  = data.text
        .replace(/```json?/g, "")
        .replace(/```/g, "")
        .trim();

      const start   = raw.indexOf("[");
      const end     = raw.lastIndexOf("]");
      if (start < 0 || end < 0) throw new Error("No JSON array in response");

      const signals = JSON.parse(raw.slice(start, end + 1));
      renderSignals(signals, capital);
      setStatus(`Last scan: ${now} · ${signals.length} ticker${signals.length !== 1 ? "s" : ""} analyzed`, false);
      if (window.kernoToast) window.kernoToast("Scan complete", "success");

    } catch (err) {
      setStatus("Scan failed — check your connection or API key.", false);
      gridEl.innerHTML = `
        <div class="signals-empty" style="grid-column:1/-1">
          <span class="signals-empty__icon" aria-hidden="true">⚠</span>
          <p class="signals-empty__text">Scan failed: ${escapeHtml(err.message)}</p>
          <p class="signals-empty__sub">Check that the Anthropic API is reachable from this environment.</p>
        </div>`;
    }

    scanning = false;
    scanBtn.disabled = false;
  }

  /* ── Prompt builder ──────────────────────────────────────────────── */

  function buildPrompt(tickers, capital) {
    const tickerList = tickers.map(t => `${t.ticker} (${t.company})`).join(", ");

    return `You are a senior portfolio manager with 20 years of experience at a multi-strategy hedge fund. You combine technical analysis, macro context, and fundamental intuition.

Analyze the following tickers and produce investment signals. Consider current market conditions, momentum, sector rotation, technical levels, and relative strength.

Tickers: ${tickerList}
Available capital to deploy: $${capital.toLocaleString()}

Return ONLY a JSON array — no markdown, no fences, no explanation before or after. Each object must have exactly these fields:

{
  "ticker": "AAPL",
  "company": "Apple Inc.",
  "signal": "BUY",
  "price": 193.42,
  "change_pct": 1.2,
  "alloc_pct": 18,
  "indicators": ["RSI 58 neutral","MACD bullish cross","Above 200-day MA"],
  "indicator_dirs": ["neu","up","up"],
  "rationale": "One to two sentences written as a senior analyst would. Reference a specific reason backed by a data point or technical level."
}

Rules:
- signal must be exactly one of: STRONG_BUY, BUY, HOLD, SELL
- price: realistic price near current market values
- change_pct: realistic today's percentage move, positive or negative
- alloc_pct: percentage of available capital. STRONG_BUY: 20–40%. BUY: 8–20%. HOLD: 0–5%. SELL: 0%. Total across all signals must not exceed 90%.
- indicators: exactly 3 short strings (under 30 chars each)
- indicator_dirs: exactly 3 strings, each "up", "down", or "neu"
- rationale: under 180 characters, specific and analytical
- Vary signals realistically — not everything can be a buy. A balanced scan has a mix.

Return the array now.`;
  }

  /* ── Render result cards ─────────────────────────────────────────── */

  function renderSignals(signals, capital) {
    let buys = 0, sells = 0, holds = 0, deployed = 0;

    gridEl.innerHTML = signals.map(s => {
      const cls       = signalClass(s.signal);
      const badgeCls  = `signal-badge--${cls}`;
      const chgUp     = s.change_pct >= 0;
      const chgStr    = (chgUp ? "+" : "") + toFixed(s.change_pct, 2) + "%";
      const chgCls    = chgUp ? "signal-price-block__val--up" : "signal-price-block__val--down";
      const dollars   = Math.round(capital * s.alloc_pct / 100);
      const barW      = Math.min(Math.round(s.alloc_pct * 2.2), 100);

      deployed += dollars;
      if (s.signal === "STRONG_BUY" || s.signal === "BUY") buys++;
      else if (s.signal === "SELL") sells++;
      else holds++;

      const indsHtml = (s.indicators || []).map((ind, i) => {
        const dir = (s.indicator_dirs || [])[i] || "neu";
        return `<span class="signal-indicator signal-indicator--${dir}">${escapeHtml(ind)}</span>`;
      }).join("");

      return `
        <article class="signal-card signal-card--${cls}" aria-label="Signal for ${escapeHtml(s.ticker)}">
          <div class="signal-card__header">
            <div class="signal-card__name">
              <p class="signal-card__ticker">${escapeHtml(s.ticker)}</p>
              <p class="signal-card__company">${escapeHtml(s.company || "")}</p>
            </div>
            <span class="signal-badge ${badgeCls}">${signalLabel(s.signal)}</span>
          </div>

          <div class="signal-card__prices">
            <div class="signal-price-block">
              <span class="signal-price-block__label">Price</span>
              <span class="signal-price-block__val">$${toFixed(s.price, 2)}</span>
            </div>
            <div class="signal-price-block">
              <span class="signal-price-block__label">Today</span>
              <span class="signal-price-block__val ${chgCls}">${chgStr}</span>
            </div>
            <div class="signal-price-block">
              <span class="signal-price-block__label">Deploy</span>
              <span class="signal-price-block__val signal-price-block__val--alloc">$${dollars.toLocaleString()}</span>
            </div>
          </div>

          <div class="signal-card__alloc">
            <div class="signal-alloc-label">
              <span>Capital allocation</span>
              <span>${s.alloc_pct}%</span>
            </div>
            <div class="signal-alloc-bar">
              <div class="signal-alloc-fill signal-alloc-fill--${cls}" style="width:${barW}%"></div>
            </div>
          </div>

          <div class="signal-card__indicators" aria-label="Technical indicators">
            ${indsHtml}
          </div>

          <p class="signal-card__rationale">${escapeHtml(s.rationale || "")}</p>
        </article>`;
    }).join("");

    /* Summary bar */
    const remaining = capital - deployed;
    sumBuy.textContent       = buys;
    sumSell.textContent      = sells;
    sumHold.textContent      = holds;
    sumCapital.textContent   = "$" + deployed.toLocaleString();
    sumRemaining.textContent = "$" + remaining.toLocaleString();
    summaryEl.hidden = false;
  }

  /* ── Helpers ─────────────────────────────────────────────────────── */

  function signalClass(signal) {
    if (signal === "STRONG_BUY") return "strong-buy";
    if (signal === "BUY")        return "buy";
    if (signal === "SELL")       return "sell";
    return "hold";
  }

  function signalLabel(signal) {
    return signal.replace("_", " ");
  }

  function toFixed(n, decimals) {
    return (parseFloat(n) || 0).toFixed(decimals);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── Auto-scan toggle ────────────────────────────────────────────── */

  if (autoToggle) {
    autoToggle.addEventListener("change", () => {
      if (autoToggle.checked) {
        runScan();
        autoTimer = setInterval(runScan, 60_000);
      } else {
        clearInterval(autoTimer);
        autoTimer = null;
      }
    });
  }

  /* ── Scan button ─────────────────────────────────────────────────── */

  if (scanBtn) {
    scanBtn.addEventListener("click", runScan);
  }

  /* ── Init ────────────────────────────────────────────────────────── */

  buildTickerGrid();
  setStatus("Select tickers and press scan to generate AI signals.", false);

})();
