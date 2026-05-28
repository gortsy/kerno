/** @typedef {'up'|'down'|'neutral'} MetricTrend */

/**
 * @typedef {Object} Metric
 * @property {string} label
 * @property {string} value
 * @property {string} delta
 * @property {MetricTrend} trend
 */

/**
 * @typedef {Object} Filing
 * @property {string} id
 * @property {string} type
 * @property {string} period
 * @property {string} filed
 */

/**
 * @typedef {Object} TickerAnalysis
 * @property {string} id
 * @property {string} company
 * @property {string} ticker
 * @property {string} sector
 * @property {string} filing
 * @property {string} filed
 * @property {string} take
 * @property {Metric[]} metrics
 * @property {string[]} signals
 * @property {string} bottomLine
 * @property {Filing[]} filings
 */

/** @type {Record<string, TickerAnalysis>} */
const KERNO_TICKERS = {
  aapl: {
    id: "aapl",
    company: "Apple Inc.",
    ticker: "AAPL",
    sector: "Technology",
    filing: "10-Q",
    filed: "May 2, 2026",
    take:
      "Services growth offsets modest iPhone softness; margins hold steady despite FX headwinds.",
    metrics: [
      { label: "Revenue YoY", value: "+4.2%", delta: "▲ vs prior Q", trend: "up" },
      { label: "Gross margin", value: "46.2%", delta: "▼ 40 bps", trend: "down" },
      { label: "FCF / share", value: "$1.42", delta: "— flat", trend: "neutral" },
    ],
    signals: [
      "Installed base crossed 2.2B active devices, up 6% YoY.",
      "Greater China revenue declined 8%; management cites competitive pricing.",
      "R&D spend rose 11% with explicit AI infrastructure investments.",
      "Buyback authorization increased by $90B; no dividend change.",
    ],
    bottomLine:
      "Fundamentals remain intact with a durable ecosystem moat; near-term risk is regional demand, not balance-sheet stress.",
    filings: [
      { id: "q1-26", type: "10-Q", period: "Q1 FY26", filed: "May 2, 2026" },
      { id: "fy25", type: "10-K", period: "FY25", filed: "Oct 31, 2025" },
      { id: "8k-lead", type: "8-K", period: "Leadership", filed: "Mar 12, 2026" },
      { id: "proxy", type: "DEF 14A", period: "Proxy", filed: "Jan 15, 2026" },
    ],
  },
  msft: {
    id: "msft",
    company: "Microsoft Corporation",
    ticker: "MSFT",
    sector: "Technology",
    filing: "10-K",
    filed: "Jul 30, 2025",
    take:
      "Azure and Copilot attach rates accelerate; operating leverage expands faster than opex.",
    metrics: [
      { label: "Cloud revenue", value: "+31%", delta: "▲ beat guide", trend: "up" },
      { label: "Op. margin", value: "44.8%", delta: "▲ 120 bps", trend: "up" },
      { label: "Net debt", value: "$42B", delta: "— stable", trend: "neutral" },
    ],
    signals: [
      "Commercial bookings grew 18% with multi-year AI workload commitments.",
      "LinkedIn and Dynamics both posted double-digit constant-currency growth.",
      "CapEx guidance raised for datacenter build-out through FY27.",
      "No material cybersecurity incidents disclosed in risk factors.",
    ],
    bottomLine:
      "Clear leader in enterprise AI spend with improving unit economics; valuation premium supported by recurring revenue mix.",
    filings: [
      { id: "fy25", type: "10-K", period: "FY25", filed: "Jul 30, 2025" },
      { id: "q3-25", type: "10-Q", period: "Q3 FY25", filed: "Apr 30, 2025" },
      { id: "8k-ai", type: "8-K", period: "Copilot", filed: "Feb 4, 2026" },
      { id: "proxy", type: "DEF 14A", period: "Proxy", filed: "Dec 5, 2025" },
    ],
  },
  nvda: {
    id: "nvda",
    company: "NVIDIA Corporation",
    ticker: "NVDA",
    sector: "Semiconductors",
    filing: "10-Q",
    filed: "May 28, 2026",
    take:
      "Data-center demand still outpaces supply; H200 ramp on track, gaming segment normalizes.",
    metrics: [
      { label: "Data center", value: "+94%", delta: "▲ record Q", trend: "up" },
      { label: "Inventory days", value: "78", delta: "▲ 12 days", trend: "down" },
      { label: "Gaming rev.", value: "$2.9B", delta: "— in-line", trend: "neutral" },
    ],
    signals: [
      "Blackwell platform sampling to top cloud providers; volume production H2.",
      "Export-control language unchanged; China revenue now under 10% of total.",
      "Gross margin guided to mid-70s as mix shifts to higher-ASP accelerators.",
      "New $25B repurchase program announced alongside earnings release.",
    ],
    bottomLine:
      "Growth narrative intact but inventory build and supply normalization are the variables to watch next quarter.",
    filings: [
      { id: "q1-26", type: "10-Q", period: "Q1 FY26", filed: "May 28, 2026" },
      { id: "fy25", type: "10-K", period: "FY25", filed: "Feb 26, 2026" },
      { id: "8k-supply", type: "8-K", period: "Supply chain", filed: "Mar 3, 2026" },
      { id: "proxy", type: "DEF 14A", period: "Proxy", filed: "Apr 18, 2026" },
    ],
  },
  googl: {
    id: "googl",
    company: "Alphabet Inc.",
    ticker: "GOOGL",
    sector: "Technology",
    filing: "10-Q",
    filed: "Apr 24, 2026",
    take:
      "Search resilience plus Cloud profitability inflection; ad load changes remain the swing factor.",
    metrics: [
      { label: "Search rev.", value: "+12%", delta: "▲ accelerating", trend: "up" },
      { label: "Cloud margin", value: "11.2%", delta: "▲ 280 bps", trend: "up" },
      { label: "Headcount", value: "182K", delta: "— flat", trend: "neutral" },
    ],
    signals: [
      "Waymo rides doubled QoQ; losses narrowed but still pre-profit at segment level.",
      "Gemini API consumption cited as fastest-growing enterprise SKU.",
      "EU antitrust remedy language unchanged; no new fine accruals.",
      "CapEx guided up 14% for TPU and datacenter expansion.",
    ],
    bottomLine:
      "Core ads business funds AI bets without balance-sheet strain; watch regulatory headlines, not operating trends.",
    filings: [
      { id: "q1-26", type: "10-Q", period: "Q1 FY26", filed: "Apr 24, 2026" },
      { id: "fy25", type: "10-K", period: "FY25", filed: "Feb 4, 2026" },
      { id: "8k-reg", type: "8-K", period: "Regulatory", filed: "Jan 20, 2026" },
      { id: "proxy", type: "DEF 14A", period: "Proxy", filed: "Apr 25, 2026" },
    ],
  },
};

const KERNO_TICKER_LIST = Object.values(KERNO_TICKERS);
