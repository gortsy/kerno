/**
 * Kerno plan catalog — map each id to Stripe Price IDs in production.
 * Set STRIPE_PRICE_* in server/.env (see server/.env.example).
 */
const KERNO_PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Solo analysts getting started",
    monthly: 49,
    annual: 39,
    seats: 1,
    filingsPerMonth: 50,
    features: [
      "50 filings / month",
      "3-second take + metrics",
      "Email support",
      "1 seat",
    ],
    stripe: {
      monthlyPriceId: "price_STARTER_MONTHLY",
      annualPriceId: "price_STARTER_ANNUAL",
    },
  },
  professional: {
    id: "professional",
    name: "Professional",
    tagline: "Research teams that live in filings",
    monthly: 149,
    annual: 119,
    seats: 5,
    filingsPerMonth: null,
    popular: true,
    features: [
      "Unlimited filings",
      "API access + exports",
      "Priority support",
      "Up to 5 seats",
      "Custom watchlists",
    ],
    stripe: {
      monthlyPriceId: "price_PRO_MONTHLY",
      annualPriceId: "price_PRO_ANNUAL",
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Compliance-heavy orgs at scale",
    monthly: 499,
    annual: 399,
    seats: null,
    filingsPerMonth: null,
    features: [
      "Everything in Professional",
      "SSO / SAML",
      "Dedicated CSM",
      "Unlimited seats",
      "SLA + audit logs",
    ],
    stripe: {
      monthlyPriceId: "price_ENT_MONTHLY",
      annualPriceId: "price_ENT_ANNUAL",
    },
  },
};

const KERNO_PLAN_LIST = Object.values(KERNO_PLANS);

const KERNO_COMPARE_ROWS = [
  { label: "Filings / month", starter: "50", professional: "Unlimited", enterprise: "Unlimited" },
  { label: "Seats", starter: "1", professional: "5", enterprise: "Unlimited" },
  { label: "API access", starter: "—", professional: "✓", enterprise: "✓" },
  { label: "SSO / SAML", starter: "—", professional: "—", enterprise: "✓" },
  { label: "Support", starter: "Email", professional: "Priority", enterprise: "Dedicated CSM" },
];
