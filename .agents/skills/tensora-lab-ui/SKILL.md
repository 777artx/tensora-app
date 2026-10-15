---
name: tensora-lab-ui
description: >-
  Tensora Lab design system and product constraints. Use when editing
  tensora-app Lab pages (Home, Market, Earn, Inference, Billing), LabChrome,
  LabDarkModule/LabHeroCard, live-on-tensora, credit-order-book, or lab.css.
---

# Tensora Lab UI

## Stack & tokens
- App: `tensora-app` under Lab routes `/lab/*`
- Shell: `LabChrome` + `.gd-lab-root` + `src/app/lab/lab.css`
- Fonts: Articulat (UI) + JetBrains Mono (numbers/tickers)
- Accent: Tensora orange (`--orange` / ~`#F5841F`)
- Surfaces: `--dark`, `--dark-elevated`, `--hero*`, light canvas `--gd-bg`
- Primitives: `LabHeroCard`, `LabDarkModule`, `LabDarkPanel`, `LabCard`, `LabButton` in `src/components/lab/ui`

## Product constraints (learned the hard way)
- **Home:** User likes the classic stacked Lab look. Do not densify/no-scroll/side-by-side dumps or crush KPIs unless explicitly asked. Prefer OG showcase KPI baselines + live deltas over naked `$0` vanity zeros.
- **Market:** Prefer the classic layout (LabHeroCard + inline trade form + `CreditOrderBook` + metric panels + open orders + How it works). Previous “desk / cinematic” redesigns were rejected — do not revive without approval.
- **Order book:** Dense realistic ladder OK; keep `CreditOrderBook` API stable for Inference (`default` variant).
- **Landing (separate):** Marketing site is `unkey-local` → www.tensoracloud.xyz — not Lab.

## Do
- Extend Lab tokens/components before inventing new visual languages
- Keep `/api/lab/market` and auth/escrow flows intact when restyling Market
- Match Articulat / mono hierarchy already in use

## Don't
- Global chrome gutter changes that break Market/Earn while fixing Home
- Fake API stats in JSON for scanners — overlay showcase in UI if product needs OG numbers
- Purple/neon “crypto terminal” restyles of Lab

## References
- Tokens: `src/app/lab/lab.css`
- Market page: `src/app/lab/market/page.tsx`
- Home live: `src/components/lab/live-on-tensora.tsx`
