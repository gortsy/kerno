/** Apply saved theme before paint — dark mode only when user enabled it in Account. */
(function () {
  if (localStorage.getItem("kerno_theme") === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
