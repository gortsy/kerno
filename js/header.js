/** Shared site header — no pricing in nav; dark mode is Account-only. */
(function injectHeader() {
  var script = document.currentScript;
  var page = (script && script.getAttribute("data-page")) || "";
  var header = document.getElementById("site-header");
  if (!header) return;

  var links = [
    { href: "index.html", label: "Home", id: "home" },
    { href: "analysis.html", label: "Analysis", id: "analysis" },
    { href: "signals.html", label: "Signal Scanner", id: "signals" },
    { href: "about.html", label: "About", id: "about" },
    { href: "account.html", label: "Account", id: "account" },
  ];

  var navHtml = links
    .map(function (l) {
      var current = l.id === page ? ' aria-current="page"' : "";
      var cls = l.id === "account" ? ' class="site-nav__account"' : "";
      return '<a href="' + l.href + '"' + cls + current + ">" + l.label + "</a>";
    })
    .join("");

  header.innerHTML =
    '<div class="site-header__inner">' +
    '  <a class="site-logo" href="index.html">' +
    '    <span class="site-logo__mark">K</span> Kerno Analytics' +
    "  </a>" +
    '  <div class="site-header__end">' +
    '    <button type="button" class="site-nav-toggle" data-nav-toggle aria-expanded="false" aria-controls="site-nav">Menu</button>' +
    '    <nav id="site-nav" class="site-nav" data-nav-panel aria-label="Main">' +
    navHtml +
    "    </nav>" +
    "  </div>" +
    "</div>";
})();
