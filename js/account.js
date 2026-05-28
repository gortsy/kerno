/** Account & settings */
(function initAccount() {
  var PROFILE_KEY = "kerno_profile";
  var NOTIFY_KEY = "kerno_notifications";

  var form = document.getElementById("profile-form");
  var planEl = document.getElementById("account-plan");
  var billingEl = document.getElementById("account-billing");

  loadProfile();
  loadSubscription();
  loadNotifications();

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        company: form.company.value.trim(),
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
      if (window.kernoToast) window.kernoToast("Profile saved", "success");
    });
  }

  document.querySelectorAll("[data-notify]").forEach(function (input) {
    input.addEventListener("change", saveNotifications);
  });

  function loadProfile() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY);
      if (!raw || !form) return;
      var p = JSON.parse(raw);
      if (p.name) form.name.value = p.name;
      if (p.email) form.email.value = p.email;
      if (p.company) form.company.value = p.company;
    } catch (_) {}
  }

  function loadSubscription() {
    try {
      var raw = sessionStorage.getItem("kerno_selected_plan");
      if (!raw) {
        if (planEl) planEl.textContent = "No active plan";
        if (billingEl) billingEl.textContent = "Choose a plan from the home page to subscribe.";
        return;
      }
      var sel = JSON.parse(raw);
      var plan = typeof KERNO_PLANS !== "undefined" && KERNO_PLANS[sel.planId];
      if (planEl) planEl.textContent = plan ? plan.name : sel.planId;
      if (billingEl) {
        billingEl.textContent =
          (sel.billing === "annual" ? "Annual" : "Monthly") +
          " · $" +
          sel.price +
          "/mo";
      }
    } catch (_) {}
  }

  function loadNotifications() {
    var defaults = { filings: true, watchlist: true, product: false };
    var saved = defaults;
    try {
      var raw = localStorage.getItem(NOTIFY_KEY);
      if (raw) saved = Object.assign(defaults, JSON.parse(raw));
    } catch (_) {}
    document.querySelectorAll("[data-notify]").forEach(function (el) {
      var key = el.getAttribute("data-notify");
      if (key && key in saved) el.checked = saved[key];
    });
  }

  function saveNotifications() {
    var out = {};
    document.querySelectorAll("[data-notify]").forEach(function (el) {
      var key = el.getAttribute("data-notify");
      if (key) out[key] = el.checked;
    });
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(out));
  }

})();
