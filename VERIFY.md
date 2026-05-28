# Kerno site verification checklist

Run locally:

```bash
cd kerno-analytics && python3 -m http.server 8080
```

## Navigation

- [ ] Header on all pages: Home, Analysis, About, Account pill + theme toggle
- [ ] **No Pricing** in global nav
- [ ] Home `#plans` → pricing.html only path to plans
- [ ] Footer links work (Analysis, Plans → home#plans, Account)

## Dark mode (Account only)

- [ ] No theme toggle in header
- [ ] Account → Appearance enables dark mode site-wide
- [ ] Preference persists after refresh
- [ ] Disabling returns to light mode
- [ ] Cards/surfaces readable in dark mode

## Analysis

- [ ] Ticker tabs switch cards with animation
- [ ] Search finds tickers (e.g. "apple")
- [ ] ← → keyboard navigation
- [ ] Watchlist add/remove + chips
- [ ] Copy link + Export JSON
- [ ] Filing sidebar highlights on click

## Pricing / checkout

- [ ] pricing.html: plan select, monthly/annual toggle, compare highlight
- [ ] Continue → checkout.html with order summary
- [ ] Professional: seat stepper updates total
- [ ] Demo checkout (no Stripe keys) → success.html

## Account

- [ ] Save profile persists in localStorage
- [ ] Subscription shows plan after demo checkout
- [ ] Notification toggles save
