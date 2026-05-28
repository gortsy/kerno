/** Enterprise footer */
(function injectFooter() {
  var footer = document.getElementById("site-footer");
  if (!footer) return;

  var year = new Date().getFullYear();

  footer.innerHTML =
    '<div class="site-footer__inner">' +
    '  <div class="site-footer__grid">' +
    '    <div class="site-footer__brand">' +
    '      <a class="site-logo" href="index.html">' +
    '        <span class="site-logo__mark">K</span> Kerno Analytics' +
    "      </a>" +
    "      <p>Institutional-grade SEC filing intelligence for research teams who cannot afford to miss a signal.</p>" +
    "    </div>" +
    '    <div class="site-footer__col">' +
    "      <h4>Product</h4>" +
    "      <ul>" +
    '        <li><a href="analysis.html">Analysis</a></li>' +
    '        <li><a href="index.html#plans">Plans</a></li>' +
    '        <li><a href="about.html">About</a></li>' +
    "      </ul>" +
    "    </div>" +
    '    <div class="site-footer__col">' +
    "      <h4>Company</h4>" +
    "      <ul>" +
    '        <li><a href="about.html">Our story</a></li>' +
    '        <li><a href="account.html">Account</a></li>' +
    "      </ul>" +
    "    </div>" +
    '    <div class="site-footer__col">' +
    "      <h4>Legal</h4>" +
    "      <ul>" +
    '        <li><a href="#">Privacy</a></li>' +
    '        <li><a href="#">Terms</a></li>' +
    "      </ul>" +
    "    </div>" +
    "  </div>" +
    '  <div class="site-footer__bottom">' +
    "    <span>&copy; " + year + " Kerno Analytics. All rights reserved.</span>" +
    "    <span>Payments secured by Stripe</span>" +
    "  </div>" +
    "</div>";
})();
