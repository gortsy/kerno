/**
 * Stripe Checkout integration
 *
 * Production flow:
 * 1. Set STRIPE_PUBLISHABLE_KEY below (pk_test_... or pk_live_...)
 * 2. Run server: cd server && npm install && npm start
 * 3. Server creates Checkout Session via POST /api/create-checkout-session
 *
 * Never put sk_ secret keys in this file.
 */
(function initStripeCheckout() {
  const STRIPE_PUBLISHABLE_KEY = ""; // e.g. pk_test_xxxxxxxx
  const API_BASE = window.location.hostname === "localhost"
    ? "http://localhost:4242"
    : ""; // same origin when deployed behind reverse proxy

  const payBtn = document.getElementById("stripe-pay-btn");
  const mountEl = document.getElementById("stripe-mount");
  const statusEl = document.getElementById("stripe-status");
  const configHint = document.getElementById("stripe-config-hint");

  if (!payBtn || !mountEl) return;

  let stripe = null;

  function setStatus(message, type = "info") {
    if (!statusEl) return;
    statusEl.hidden = false;
    statusEl.textContent = message;
    statusEl.className = "stripe-status stripe-status--" + type;
  }

  function getCheckoutPayload() {
    const raw = sessionStorage.getItem("kerno_selected_plan");
    const seats = Number(sessionStorage.getItem("kerno_seats")) || 1;
    if (!raw) return null;
    try {
      const selection = JSON.parse(raw);
      return { ...selection, seats, successUrl: absoluteUrl("success.html"), cancelUrl: absoluteUrl("checkout.html") };
    } catch {
      return null;
    }
  }

  function absoluteUrl(path) {
    return new URL(path, window.location.href).href;
  }

  async function initStripeJs() {
    if (!window.Stripe) {
      setStatus("Loading Stripe…", "info");
      await loadScript("https://js.stripe.com/v3/");
    }
    if (!STRIPE_PUBLISHABLE_KEY) {
      mountEl.innerHTML = `
        <p><strong>Demo mode</strong> — Add your <code>pk_test_</code> key to <code>js/stripe-checkout.js</code> and start the API in <code>server/</code>.</p>
        <p>The pay button will call your backend to open Stripe Checkout.</p>`;
      setStatus("Stripe publishable key not configured. Demo checkout available.", "info");
      if (configHint) configHint.hidden = false;
      payBtn.textContent = "Try demo checkout";
      return null;
    }
    stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);
    mountEl.classList.add("is-ready");
    mountEl.innerHTML = "<p>Stripe.js loaded. Click below to open secure Checkout.</p>";
    setStatus("Ready for payment. You will be redirected to Stripe.", "success");
    if (configHint) configHint.hidden = true;
    return stripe;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function createCheckoutSession(payload) {
    const res = await fetch(API_BASE + "/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Could not create checkout session");
    }
    return res.json();
  }

  payBtn.addEventListener("click", async () => {
    const payload = getCheckoutPayload();
    if (!payload) {
      setStatus("No plan selected. Go back to pricing.", "error");
      if (window.kernoToast) window.kernoToast("Select a plan first");
      return;
    }

    payBtn.disabled = true;
    setStatus("Preparing checkout…", "info");

    try {
      await initStripeJs();

      if (!STRIPE_PUBLISHABLE_KEY) {
        demoCheckout(payload);
        return;
      }

      const { sessionId, url } = await createCheckoutSession(payload);

      if (url) {
        window.location.href = url;
        return;
      }

      if (sessionId && stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      setStatus(msg + " — Is the server running on port 4242?", "error");
      if (window.kernoToast) window.kernoToast(msg);
      payBtn.disabled = false;
    }
  });

  function demoCheckout(payload) {
    const plan = KERNO_PLANS[payload.planId];
    setStatus("Demo: simulating Stripe redirect…", "info");
    window.setTimeout(() => {
      sessionStorage.setItem(
        "kerno_last_checkout",
        JSON.stringify({ ...payload, planName: plan?.name, demo: true, at: Date.now() })
      );
      window.location.href = "success.html?demo=1";
    }, 1200);
  }

  window.addEventListener("kerno:checkout-updated", () => {
    setStatus("Order updated.", "info");
  });

  initStripeJs();
})();
