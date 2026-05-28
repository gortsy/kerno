/** Shared Kerno site behaviors */
(function initApp() {
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navPanel = document.querySelector("[data-nav-panel]");
  const yearEl = document.querySelector("[data-year]");
  const siteHeader = document.querySelector(".site-header");

  initHeaderScroll();

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  function initHeaderScroll() {
    if (!siteHeader) return;
    const onScroll = () => {
      siteHeader.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  if (navToggle && navPanel) {
    navToggle.addEventListener("click", () => {
      const open = navPanel.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    document.addEventListener("click", (e) => {
      if (!navPanel.classList.contains("is-open")) return;
      const target = /** @type {Node} */ (e.target);
      if (navPanel.contains(target) || navToggle.contains(target)) return;
      navPanel.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });

    navPanel.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navPanel.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) document.documentElement.classList.add("reduce-motion");

})();
