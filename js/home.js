/** Home page — rotating preview card */
(function initHome() {
  const previewRoot = document.getElementById("home-preview");
  if (!previewRoot || typeof KERNO_TICKERS === "undefined") return;

  const ids = ["aapl", "msft", "nvda"];
  let index = 0;

  function show() {
    const id = ids[index];
    previewRoot.innerHTML = renderTickerCard(KERNO_TICKERS[id]);
    animateCardIn(previewRoot);
    index = (index + 1) % ids.length;
  }

  show();
  const interval = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? null
    : window.setInterval(show, 6000);

  previewRoot.addEventListener("mouseenter", () => {
    if (interval) clearInterval(interval);
  });
})();
