/**
 * Kerno Analytics — Analysis page
 * Calls the Python API (/api/analyze) for real SEC filing analysis.
 * Falls back to static KERNO_TICKERS data if the API is unreachable.
 */
(function initAnalysis() {
  const cardRoot      = document.getElementById("ticker-card-root");
  const filingsRoot   = document.getElementById("filings-list");
  const selectorRoot  = document.getElementById("ticker-selector");
  const searchInput   = document.getElementById("ticker-search");
  const searchResults = document.getElementById("ticker-search-results");
  const metaEl        = document.getElementById("analysis-meta");

  if (!cardRoot) return;

  const tickers  = typeof KERNO_TICKER_LIST !== "undefined" ? KERNO_TICKER_LIST : [];
  let activeId   = resolveInitialTicker();
  let activeFilingId = tickers.find(t => t.id === activeId)?.filings?.[0]?.id ?? "";
  let apiOnline  = null;

  const WATCH_KEY = "kerno_watchlist";
  const CACHE_KEY = "kerno_api_cache";
  const CACHE_TTL = 5 * 60 * 1000;

  buildSelector();
  render(activeId);
  renderWatchlist();
  bindSearch();
  bindKeyboard();
  bindActions();
  probeApi();

  async function probeApi() {
    try {
      const r = await fetch("/api/health", { signal: AbortSignal.timeout(8000) });
      apiOnline = r.ok;
    } catch { apiOnline = false; }
  }

  function cacheGet(ticker) {
    try {
      const store = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "{}");
      const entry = store[ticker.toLowerCase()];
      if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    } catch { }
    return null;
  }

  function cacheSet(ticker, data) {
    try {
      const store = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "{}");
      store[ticker.toLowerCase()] = { ts: Date.now(), data };
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(store));
    } catch { }
  }

  function resolveInitialTicker() {
    const params   = new URLSearchParams(window.location.search);
    const fromQ    = params.get("ticker")?.toLowerCase();
    const fromHash = window.location.hash.replace("#", "").toLowerCase();
    const known    = typeof KERNO_TICKERS !== "undefined" ? KERNO_TICKERS : {};
    if (fromQ && known[fromQ])       return fromQ;
    if (fromHash && known[fromHash]) return fromHash;
    return "aapl";
  }

  function buildSelector() {
    if (!selectorRoot) return;
    selectorRoot.innerHTML = tickers.map(t =>
      `<button type="button" class="ticker-selector__btn" role="tab"
        id="tab-${t.id}" aria-selected="false" aria-controls="ticker-card-root"
        data-ticker="${t.id}">${t.ticker}</button>`
    ).join("");
    selectorRoot.querySelectorAll(".ticker-selector__btn").forEach(btn =>
      btn.addEventListener("click", () => select(btn.getAttribute("data-ticker")))
    );
  }

  function select(id) {
    const known = typeof KERNO_TICKERS !== "undefined" ? KERNO_TICKERS : {};
    if (!known[id] && !tickers.find(t => t.id === id)) return;
    const changed = id !== activeId;
    activeId = id;
    syncUrl();
    render(id);
    if (changed && window.kernoToast) {
      window.kernoToast(`Now viewing ${known[id]?.ticker || id.toUpperCase()}`);
    }
    updateWatchBtn();
  }

  async function render(id) {
    const known  = typeof KERNO_TICKERS !== "undefined" ? KERNO_TICKERS : {};
    const ticker = known[id]?.ticker || id.toUpperCase();

    selectorRoot?.querySelectorAll(".ticker-selector__btn").forEach(btn => {
      const on = btn.getAttribute("data-ticker") === id;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    updateWatchBtn();
    renderWatchlist();

    const cached = cacheGet(id);
    if (cached) { renderCard(cached); renderFilingsPanel(cached); setMeta(cached); return; }

    showLoadingCard(ticker);

    let apiData = null;
    if (apiOnline !== false) {
      try {
        const r = await fetch(`/api/analyze?ticker=${encodeURIComponent(ticker)}`,
          { signal: AbortSignal.timeout(35000) });
        if (r.ok) {
          apiData = normaliseApiResponse(await r.json(), known[id]);
          apiOnline = true;
          cacheSet(id, apiData);
        } else { apiOnline = false; }
      } catch { apiOnline = false; }
    }

    const data = apiData || known[id];
    if (!data) {
      cardRoot.innerHTML = `<div class="ticker-card" style="text-align:center;padding:3rem 2rem;color:var(--kerno-grey-400)">
        <p>No data for <strong>${escapeHtml(ticker)}</strong>.</p>
        <p style="font-size:.875rem">Start the Python server to enable live analysis.</p></div>`;
      return;
    }

    if (!apiData && window.kernoToast) window.kernoToast("API offline — showing cached data");
    renderCard(data);
    renderFilingsPanel(data);
    setMeta(data);
  }

  function normaliseApiResponse(api, fallback) {
    return {
      id: (api.ticker || "").toLowerCase(),
      ticker:    api.ticker || fallback?.ticker || "",
      company:   api.name   || fallback?.company || "",
      sector:    fallback?.sector || "—",
      filing:    api.form   || fallback?.filing || "",
      filed:     api.date   || fallback?.filed  || "",
      viewer_url: api.viewer_url || "",
      take:      api.three_second_take || "",
      sourced:   api.sourced_from_filing ?? true,
      metrics: [
        { label: api.metric1_label || "Metric 1", value: api.metric1_value || "—", delta: api.metric1_change || "", trend: dir(api.metric1_dir) },
        { label: api.metric2_label || "Metric 2", value: api.metric2_value || "—", delta: api.metric2_change || "", trend: dir(api.metric2_dir) },
        { label: api.metric3_label || "Metric 3", value: api.metric3_value || "—", delta: api.metric3_change || "", trend: dir(api.metric3_dir) },
      ],
      signals:    api.key_signals     || [],
      mgmtTone:   api.management_tone || [],
      risks:      api.risks           || [],
      bottomLine: api.bottom_line     || "",
      filings:    fallback?.filings   || [],
    };
  }

  function dir(d) {
    if (!d) return "neutral";
    const v = d.toLowerCase();
    return v === "up" ? "up" : v === "down" ? "down" : "neutral";
  }

  function renderCard(data) {
    cardRoot.innerHTML = data.risks || data.mgmtTone
      ? renderApiCard(data)
      : (typeof renderTickerCard === "function" ? renderTickerCard(data) : "");
    animateCardIn(cardRoot);
  }

  function renderApiCard(data) {
    const metrics = (data.metrics || []).map(m => `
      <article class="metric-card metric-card--${m.trend}">
        <span class="metric-card__label">${escapeHtml(m.label)}</span>
        <span class="metric-card__value">${escapeHtml(m.value)}</span>
        <span class="metric-card__delta" aria-hidden="true">${escapeHtml(m.delta)}</span>
      </article>`).join("");

    const list = items => (items || []).map((s, i) =>
      `<li style="--signal-index:${i}">${escapeHtml(s)}</li>`).join("");

    const sourceBadge = data.sourced
      ? `<span class="ticker-card__filing" style="background:var(--kerno-up-bg);color:var(--kerno-up)">Live SEC data</span>`
      : `<span class="ticker-card__filing" style="background:var(--kerno-orange-light);color:var(--kerno-orange)">Training data</span>`;

    const viewerLink = data.viewer_url
      ? `<div class="ticker-card__source">
           <a href="${escapeHtml(data.viewer_url)}" target="_blank" rel="noopener"
              style="font-size:.8125rem;color:var(--kerno-orange)">View source on SEC EDGAR ↗</a>
         </div>` : "";

    const extraSection = (title, items) => items?.length ? `
      <section class="ticker-card__signals">
        <h3 class="ticker-card__signals-title">${title}</h3>
        <ul class="ticker-card__signals-list">${list(items)}</ul>
      </section>` : "";

    return `
      <article class="ticker-card is-entering" aria-label="Analysis for ${escapeHtml(data.company)}">
        <header class="ticker-card__header">
          <div class="ticker-card__title-block">
            <h2 class="ticker-card__company">${escapeHtml(data.company)}</h2>
            <p class="ticker-card__sector">${escapeHtml(data.sector)} · Filed ${escapeHtml(data.filed)}</p>
          </div>
          <div class="ticker-card__meta">
            <span class="ticker-card__ticker">${escapeHtml(data.ticker)}</span>
            <span class="ticker-card__filing">${escapeHtml(data.filing)}</span>
            ${sourceBadge}
          </div>
        </header>
        <section class="ticker-card__take">
          <span class="ticker-card__take-label">3-second take</span>
          <p class="ticker-card__take-text">${escapeHtml(data.take)}</p>
        </section>
        <section class="ticker-card__metrics" aria-label="Key metrics">${metrics}</section>
        <section class="ticker-card__signals">
          <h3 class="ticker-card__signals-title">Key signals</h3>
          <ul class="ticker-card__signals-list">${list(data.signals)}</ul>
        </section>
        ${extraSection("Management tone", data.mgmtTone)}
        ${extraSection("Risks to watch",  data.risks)}
        <section class="ticker-card__bottom-line">
          <span class="ticker-card__bottom-line-label">Bottom line</span>
          <p class="ticker-card__bottom-line-text">${escapeHtml(data.bottomLine)}</p>
        </section>
        ${viewerLink}
      </article>`;
  }

  function showLoadingCard(ticker) {
    cardRoot.innerHTML = `
      <div class="ticker-card" aria-busy="true">
        <div class="ticker-card__header" style="padding-bottom:var(--space-lg);border-bottom:1px solid var(--kerno-grey-200)">
          <div>
            <div class="skeleton-shimmer" style="width:14rem;height:1.5rem;margin-bottom:6px;border-radius:var(--radius-sm)"></div>
            <div class="skeleton-shimmer" style="width:8rem;height:.8rem;border-radius:var(--radius-sm)"></div>
          </div>
        </div>
        <div class="skeleton-shimmer" style="height:4.5rem;border-radius:var(--radius-md)"></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-md)">
          <div class="skeleton-shimmer" style="height:5rem;border-radius:var(--radius-md)"></div>
          <div class="skeleton-shimmer" style="height:5rem;border-radius:var(--radius-md)"></div>
          <div class="skeleton-shimmer" style="height:5rem;border-radius:var(--radius-md)"></div>
        </div>
        <div>
          <div class="skeleton-shimmer" style="height:.875rem;margin-bottom:8px;border-radius:var(--radius-sm)"></div>
          <div class="skeleton-shimmer" style="height:.875rem;margin-bottom:8px;width:85%;border-radius:var(--radius-sm)"></div>
          <div class="skeleton-shimmer" style="height:.875rem;width:70%;border-radius:var(--radius-sm)"></div>
        </div>
        <p style="text-align:center;font-size:.8125rem;color:var(--kerno-grey-400);margin:0">
          Fetching SEC filing for <strong>${escapeHtml(ticker)}</strong> and running Gemini analysis…
        </p>
      </div>`;
  }

  function renderFilingsPanel(data) {
    if (!filingsRoot) return;
    if (!data.filings?.length) {
      filingsRoot.innerHTML = `<li style="font-size:.8125rem;color:var(--kerno-grey-400)">No filing history</li>`;
      return;
    }
    if (typeof renderFilingsList === "function") {
      filingsRoot.innerHTML = renderFilingsList(data.filings, activeFilingId);
      filingsRoot.querySelectorAll(".filing-link").forEach(btn =>
        btn.addEventListener("click", () => {
          activeFilingId = btn.getAttribute("data-filing-id") ?? "";
          filingsRoot.querySelectorAll(".filing-link").forEach(el =>
            el.classList.toggle("is-active", el === btn));
        })
      );
    }
  }

  function setMeta(data) {
    if (metaEl) metaEl.textContent = `Viewing ${data.ticker} · ${data.filing} · ${data.filed}`;
  }

  function getWatchlist() {
    try { return JSON.parse(localStorage.getItem(WATCH_KEY) || "[]"); }
    catch { return []; }
  }

  function setWatchlist(ids) { localStorage.setItem(WATCH_KEY, JSON.stringify(ids)); }

  function updateWatchBtn() {
    const btn = document.getElementById("watch-btn");
    if (!btn) return;
    const on = getWatchlist().includes(activeId);
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = on ? "★ On watchlist" : "☆ Add to watchlist";
  }

  function renderWatchlist() {
    const root  = document.getElementById("watchlist-chips");
    if (!root) return;
    const known = typeof KERNO_TICKERS !== "undefined" ? KERNO_TICKERS : {};
    const list  = getWatchlist().filter(id => known[id]);
    root.innerHTML = list.length
      ? list.map(id => `<button type="button" class="watchlist-chip" data-goto="${id}">${known[id].ticker}</button>`).join("")
      : '<span class="watchlist-empty">No tickers saved yet</span>';
    root.querySelectorAll(".watchlist-chip").forEach(chip =>
      chip.addEventListener("click", () => select(chip.getAttribute("data-goto")))
    );
  }

  function bindActions() {
    document.getElementById("copy-link-btn")?.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(window.location.href); }
      catch { }
      if (window.kernoToast) window.kernoToast("Link copied", "success");
    });

    document.getElementById("watch-btn")?.addEventListener("click", () => {
      let list = getWatchlist();
      if (list.includes(activeId)) {
        list = list.filter(x => x !== activeId);
        if (window.kernoToast) window.kernoToast("Removed from watchlist");
      } else {
        list = [...list, activeId];
        if (window.kernoToast) window.kernoToast("Added to watchlist", "success");
      }
      setWatchlist(list); updateWatchBtn(); renderWatchlist();
    });

    document.getElementById("export-json-btn")?.addEventListener("click", () => {
      const known   = typeof KERNO_TICKERS !== "undefined" ? KERNO_TICKERS : {};
      const payload = cacheGet(activeId) || known[activeId];
      if (!payload) return;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob),
        download: `${(payload.ticker || activeId).toUpperCase()}-analysis.json`,
      });
      a.click(); URL.revokeObjectURL(a.href);
      if (window.kernoToast) window.kernoToast("JSON exported", "success");
    });
  }

  function bindSearch() {
    if (!searchInput || !searchResults) return;
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) { searchResults.hidden = true; return; }
      const matches = tickers.filter(t =>
        t.ticker.toLowerCase().includes(q) || t.company.toLowerCase().includes(q));
      searchResults.innerHTML = matches.length
        ? matches.map(t => `<li><button type="button" class="search-result" data-ticker="${t.id}">
            <span class="search-result__ticker">${t.ticker}</span>
            <span class="search-result__name">${escapeHtml(t.company)}</span>
          </button></li>`).join("")
        : `<li class="search-empty">No tickers match "${escapeHtml(q)}"</li>`;
      searchResults.hidden = false;
      searchResults.querySelectorAll(".search-result").forEach(btn =>
        btn.addEventListener("click", () => {
          select(btn.getAttribute("data-ticker"));
          searchInput.value = ""; searchResults.hidden = true; searchInput.blur();
        })
      );
    });
    searchInput.addEventListener("keydown", e => {
      if (e.key === "Escape") { searchResults.hidden = true; searchInput.blur(); }
      if (e.key === "Enter") searchResults.querySelector(".search-result")?.click();
    });
    document.addEventListener("click", e => {
      if (e.target !== searchInput && !searchResults.contains(e.target)) searchResults.hidden = true;
    });
  }

  function bindKeyboard() {
    document.addEventListener("keydown", e => {
      if (!selectorRoot || e.target instanceof HTMLInputElement) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const idx = tickers.findIndex(t => t.id === activeId);
      if (idx < 0) return;
      e.preventDefault();
      const next = e.key === "ArrowRight"
        ? tickers[(idx + 1) % tickers.length]
        : tickers[(idx - 1 + tickers.length) % tickers.length];
      select(next.id);
      document.getElementById(`tab-${next.id}`)?.focus();
    });
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("ticker", activeId); url.hash = activeId;
    history.replaceState({ ticker: activeId }, "", url);
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  window.addEventListener("popstate", () => {
    const id = resolveInitialTicker();
    if (id !== activeId) { activeId = id; render(id); }
  });
})();
