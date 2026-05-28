/** Checkout page — order summary, seats, hands off to Stripe */
(function initCheckout() {
  const summaryRoot = document.getElementById("order-summary");
  const seatsWrap = document.getElementById("seats-control");
  const changePlanLink = document.getElementById("change-plan");

  if (!summaryRoot || typeof KERNO_PLANS === "undefined") return;

  const STORAGE_KEY = "kerno_selected_plan";
  const params = new URLSearchParams(window.location.search);
  let selection = loadSelection();

  if (!selection || !KERNO_PLANS[selection.planId]) {
    const planId = params.get("plan") ?? "professional";
    const billing = params.get("billing") ?? "monthly";
    const plan = KERNO_PLANS[planId];
    if (plan) {
      selection = {
        planId,
        billing,
        price: billing === "annual" ? plan.annual : plan.monthly,
        stripePriceId:
          billing === "annual" ? plan.stripe.annualPriceId : plan.stripe.monthlyPriceId,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    }
  }

  if (!selection) {
    window.location.href = "pricing.html";
    return;
  }

  let seats = Math.min(5, Math.max(1, Number(sessionStorage.getItem("kerno_seats")) || 1));
  const plan = KERNO_PLANS[selection.planId];

  if (changePlanLink) changePlanLink.href = "pricing.html";

  renderSummary();
  bindSeats();

  function loadSelection() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function persist() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    sessionStorage.setItem("kerno_seats", String(seats));
    window.dispatchEvent(new CustomEvent("kerno:checkout-updated", { detail: { selection, seats } }));
  }

  function lineTotal() {
    const base = selection.price * (selection.billing === "annual" ? 12 : 1);
    if (selection.planId === "professional") return base * seats;
    if (selection.planId === "enterprise") return base;
    return base;
  }

  function renderSummary() {
    const billingLabel =
      selection.billing === "annual" ? "Annual (per month shown)" : "Monthly";
    const total = lineTotal();
    const showSeats = selection.planId === "professional";

    if (seatsWrap) seatsWrap.hidden = !showSeats;

    summaryRoot.innerHTML = `
      <h2 class="checkout-panel__title">Order summary</h2>
      <div class="order-summary__row">
        <span>Plan</span>
        <strong>${plan.name}</strong>
      </div>
      <div class="order-summary__row">
        <span>Billing</span>
        <span>${billingLabel}</span>
      </div>
      ${showSeats ? `<div class="order-summary__row"><span>Seats</span><span id="summary-seats">${seats}</span></div>` : ""}
      <div class="order-summary__row">
        <span>Unit price</span>
        <span>$${selection.price}/mo</span>
      </div>
      <div class="order-summary__row order-summary__row--total">
        <span>Due today</span>
        <span id="summary-total">$${total.toLocaleString()}</span>
      </div>`;

    persist();
  }

  function bindSeats() {
    if (!seatsWrap) return;
    const minus = seatsWrap.querySelector("[data-seats-minus]");
    const plus = seatsWrap.querySelector("[data-seats-plus]");
    const val = seatsWrap.querySelector("[data-seats-value]");

    function refresh() {
      if (val) val.textContent = String(seats);
      const summarySeats = document.getElementById("summary-seats");
      const summaryTotal = document.getElementById("summary-total");
      if (summarySeats) summarySeats.textContent = String(seats);
      if (summaryTotal) summaryTotal.textContent = "$" + lineTotal().toLocaleString();
      if (minus) minus.disabled = seats <= 1;
      if (plus) plus.disabled = seats >= 5;
      persist();
    }

    minus?.addEventListener("click", () => {
      seats = Math.max(1, seats - 1);
      refresh();
    });
    plus?.addEventListener("click", () => {
      seats = Math.min(5, seats + 1);
      refresh();
    });
    refresh();
  }
})();
