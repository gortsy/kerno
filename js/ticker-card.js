/**
 * Renders a Kerno ticker analysis result card.
 * @param {import('./data.js').TickerAnalysis} data
 * @returns {string}
 */
function renderTickerCard(data) {
  const metricsHtml = data.metrics
    .map(
      (m) => `
      <article class="metric-card metric-card--${m.trend}" data-trend="${m.trend}">
        <span class="metric-card__label">${escapeHtml(m.label)}</span>
        <span class="metric-card__value">${escapeHtml(m.value)}</span>
        <span class="metric-card__delta" aria-hidden="true">${escapeHtml(m.delta)}</span>
        <span class="sr-only">${trendLabel(m.trend)}: ${escapeHtml(m.delta.replace(/[▲▼—]/g, "").trim())}</span>
      </article>`
    )
    .join("");

  const signalsHtml = data.signals
    .map((s, i) => `<li style="--signal-index: ${i}">${escapeHtml(s)}</li>`)
    .join("");

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
        </div>
      </header>

      <section class="ticker-card__take">
        <span class="ticker-card__take-label">3-second take</span>
        <p class="ticker-card__take-text">${escapeHtml(data.take)}</p>
      </section>

      <section class="ticker-card__metrics" aria-label="Key metrics">
        ${metricsHtml}
      </section>

      <section class="ticker-card__signals">
        <h3 class="ticker-card__signals-title">Key signals</h3>
        <ul class="ticker-card__signals-list">
          ${signalsHtml}
        </ul>
      </section>

      <section class="ticker-card__bottom-line">
        <span class="ticker-card__bottom-line-label">Bottom line</span>
        <p class="ticker-card__bottom-line-text">${escapeHtml(data.bottomLine)}</p>
      </section>
    </article>`;
}

/**
 * @param {import('./data.js').Filing[]} filings
 * @param {string} activeId
 */
function renderFilingsList(filings, activeId) {
  return filings
    .map(
      (f) => `
      <li>
        <button
          type="button"
          class="filing-link${f.id === activeId ? " is-active" : ""}"
          data-filing-id="${escapeHtml(f.id)}"
        >
          <span class="filing-link__type">${escapeHtml(f.type)}</span>
          <span class="filing-link__period">${escapeHtml(f.period)}</span>
          <span class="filing-link__date">${escapeHtml(f.filed)}</span>
        </button>
      </li>`
    )
    .join("");
}

/** @param {string} str */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {import('./data.js').MetricTrend} trend */
function trendLabel(trend) {
  if (trend === "up") return "Trending up";
  if (trend === "down") return "Trending down";
  return "Unchanged";
}

/** Trigger enter animation after paint */
function animateCardIn(root) {
  const card = root.querySelector(".ticker-card");
  if (!card) return;
  requestAnimationFrame(() => {
    card.classList.remove("is-entering");
    card.classList.add("is-visible");
  });
}
