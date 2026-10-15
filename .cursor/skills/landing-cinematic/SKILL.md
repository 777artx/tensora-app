---
name: landing-cinematic
description: >-
  Tensora marketing landing (unkey-local) Three.js/GSAP cinematic build. Use when
  editing unkey-local landing.js/css/html, PC parts fly-in, case/McLaren models,
  scroll scrub, or deploying www.tensoracloud.xyz.
---

# Landing cinematic (unkey-local)

## Paths
- Project: `C:\Users\thepa\The Network\unkey-local`
- Entry: `index.html`, `assets/landing.js`, `assets/landing.css`
- Models: `models/*.glb` — case is Corsair 4000D (`case.glb`); backup `case-4000d.glb`
- Local: `http://127.0.0.1:8766/` · Prod: `https://www.tensoracloud.xyz/`
- Deploy: `npx vercel --prod --yes` from `unkey-local` (ignore `node_modules`, `_inspect-parts`, `models-backup`)

## Conventions
- Case open side **+Z**, front **+X**; parts seat via `CONFIG` in `landing.js`
- Cache-bust `ASSET_V` / `?v=partsNN` in `index.html` on asset/JS changes
- McLaren is roof trophy — not the case
- **Pixel/holographic resolve:** removed by user preference — do not re-enable unless asked
- Prefer smoother scroll scrub + parallel GLB preload over hitchy loads

## Case swaps
- NZXT attempt failed fit — user reverted to 4000D. Don’t swap shells without approval + local try first.
- Sketchfab downloads often need the user to drop a zip into `models-raw/`.

## Attribution
Keep `models/ATTRIBUTION.md` accurate when changing third-party GLBs.
