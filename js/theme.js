/** Theme helpers — toggle only from Account settings. */
(function () {
  function isDark() {
    return localStorage.getItem("kerno_theme") === "dark";
  }

  function applyTheme(dark) {
    if (dark) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("kerno_theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("kerno_theme", "light");
    }
    var accountToggle = document.querySelector("[data-theme-toggle-account]");
    if (accountToggle) accountToggle.checked = dark;
  }

  function initAccountThemeToggle() {
    document.querySelectorAll("[data-theme-toggle-account]").forEach(function (input) {
      input.checked = isDark();
      input.addEventListener("change", function () {
        applyTheme(input.checked);
        if (window.kernoToast) {
          window.kernoToast(input.checked ? "Dark mode enabled" : "Light mode enabled", "success");
        }
      });
    });
  }

  window.kernoTheme = { isDark: isDark, applyTheme: applyTheme, init: initAccountThemeToggle };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAccountThemeToggle);
  } else {
    initAccountThemeToggle();
  }
})();
