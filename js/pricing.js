/** Pricing page — plan selection + billing toggle */
(function initPricing() {
  const grid = document.getElementById("plan-grid");
  const ctaBtn = document.getElementById("pricing-continue");
  const summaryEl = document.getElementById("pricing-selection-summary");
  const detailEl = document.getElementById("pricing-selection-detail");
  const billingBtns = document.querySelectorAll("[data-billing]");

  if (!grid || typeof KERNO_PLANS === "undefined") return;

  const STORAGE_KEY = "kerno_selected_plan";

  let billing = "monthly";
  let selectedId = loadSelection()?.planId ?? "professional";

  renderPlans();
  updateUI();
  bindBilling();
  bindCompareHighlight();

  function loadSelection() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveSelection() {
    const plan = KERNO_PLANS[selectedId];
    if (!plan) return;
    const payload = {
      planId: selectedId,
      billing,
      price: billing === "annual" ? plan.annual : plan.monthly,
      stripePriceId:
        billing === "annual" ? plan.stripe.annualPriceId : plan.stripe.monthlyPriceId,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
  }

  function renderPlans() {
    grid.innerHTML = KERNO_PLAN_LIST.map((plan) => {
      const price = billing === "annual" ? plan.annual : plan.monthly;
      const period = billing === "annual" ? "/ mo, billed annually" : "/ month";
      const popular = plan.popular
        ? '<span class="plan-card__badge">Most popular</span>'
        : "";

      return `
        <label class="plan-card${plan.popular ? " is-popular" : ""}${selectedId === plan.id ? " is-selected" : ""}" data-plan-id="${plan.id}">
          <input type="radio" name="plan" class="plan-card__radio" value="${plan.id}" ${selectedId === plan.id ? "checked" : ""}>
          <span class="plan-card__check" aria-hidden="true"></span>
          ${popular}
          <h2 class="plan-card__name">${plan.name}</h2>
          <p class="plan-card__tagline">${plan.tagline}</p>
          <div class="plan-card__price">
            <span class="plan-card__amount" data-price-for="${plan.id}">$${price}</span>
            <span class="plan-card__period">${period}</span>
          </div>
          <ul class="plan-card__features">
            ${plan.features.map((f) => `<li>${f}</li>`).join("")}
          </ul>
        </label>`;
    }).join("");

    grid.querySelectorAll(".plan-card").forEach((card) => {
      card.addEventListener("click", () => {
        selectedId = card.getAttribute("data-plan-id") ?? "professional";
        grid.querySelectorAll(".plan-card").forEach((c) => {
          c.classList.toggle("is-selected", c.getAttribute("data-plan-id") === selectedId);
          const radio = c.querySelector(".plan-card__radio");
          if (radio) radio.checked = c.classList.contains("is-selected");
        });
        updateUI();
        bindCompareHighlight();
        if (window.kernoToast) window.kernoToast(`${KERNO_PLANS[selectedId].name} selected`, "success");
      });
    });
  }

  function bindBilling() {
    billingBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        billing = btn.getAttribute("data-billing") ?? "monthly";
        billingBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
        renderPlans();
        updateUI();
        bindCompareHighlight();
      });
    });
  }

  function updateUI() {
    const plan = KERNO_PLANS[selectedId];
    if (!plan) return;
    const price = billing === "annual" ? plan.annual : plan.monthly;
    const saved = saveSelection();

    if (summaryEl) {
      summaryEl.textContent = `${plan.name} — $${price}/mo`;
    }
    if (detailEl) {
      detailEl.textContent =
        billing === "annual"
          ? "Billed annually · Save 20% vs monthly"
          : "Billed monthly · Cancel anytime";
    }
    if (ctaBtn) {
      ctaBtn.disabled = false;
      ctaBtn.href = `checkout.html?plan=${selectedId}&billing=${billing}`;
    }
  }

  function bindCompareHighlight() {
    document.querySelectorAll("[data-compare-col]").forEach((el) => {
      el.classList.toggle("is-highlight", el.getAttribute("data-compare-col") === selectedId);
    });
  }

  if (ctaBtn) {
    ctaBtn.addEventListener("click", (e) => {
      if (!KERNO_PLANS[selectedId]) {
        e.preventDefault();
        if (window.kernoToast) window.kernoToast("Select a plan to continue", "default");
      }
    });
  }

  const saved = loadSelection();
  if (saved?.billing) {
    billing = saved.billing;
    billingBtns.forEach((b) =>
      b.classList.toggle("is-active", b.getAttribute("data-billing") === billing)
    );
  }
})();
