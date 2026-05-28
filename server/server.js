/**
 * Kerno Analytics — Stripe Checkout API
 *
 * POST /api/create-checkout-session
 * Body: { planId, billing, stripePriceId, seats, successUrl, cancelUrl }
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const PORT = process.env.PORT || 4242;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:8080";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/** Fallback map when client sends placeholder price ids */
const PRICE_MAP = {
  price_STARTER_MONTHLY: process.env.STRIPE_PRICE_STARTER_MONTHLY,
  price_STARTER_ANNUAL: process.env.STRIPE_PRICE_STARTER_ANNUAL,
  price_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
  price_PRO_ANNUAL: process.env.STRIPE_PRICE_PRO_ANNUAL,
  price_ENT_MONTHLY: process.env.STRIPE_PRICE_ENT_MONTHLY,
  price_ENT_ANNUAL: process.env.STRIPE_PRICE_ENT_ANNUAL,
};

const app = express();
app.use(cors({ origin: [CLIENT_ORIGIN, "http://127.0.0.1:8080", "http://localhost:8080"] }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, stripe: Boolean(stripe) });
});

app.post("/api/create-checkout-session", async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: "Stripe not configured. Copy server/.env.example to server/.env and set STRIPE_SECRET_KEY.",
    });
  }

  const { planId, billing, stripePriceId, seats = 1, successUrl, cancelUrl } = req.body || {};

  let priceId = stripePriceId;
  if (priceId && PRICE_MAP[priceId]) {
    priceId = PRICE_MAP[priceId];
  }
  if (!priceId || !priceId.startsWith("price_")) {
    return res.status(400).json({
      error: "Invalid or missing Stripe Price ID. Create prices in Stripe Dashboard and set server/.env.",
    });
  }

  const quantity =
    planId === "professional" ? Math.min(5, Math.max(1, Number(seats) || 1)) : 1;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity }],
      success_url: successUrl || `${CLIENT_ORIGIN}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${CLIENT_ORIGIN}/checkout.html`,
      metadata: { planId: planId || "", billing: billing || "monthly" },
      allow_promotion_codes: true,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Stripe error" });
  }
});

app.listen(PORT, () => {
  console.log(`Kerno Stripe API → http://localhost:${PORT}`);
  if (!stripe) console.warn("Warning: STRIPE_SECRET_KEY missing — checkout will return 503");
});
