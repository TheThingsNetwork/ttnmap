# TTN Gateway Atlas

Gateway Atlas shows live Packet Broker gateways on an interactive MapLibre view with a TTN-inspired UI.

## Architecture

| Layer | Summary |
| --- | --- |
| Vite + React | Single-page app built with Vite, TypeScript, and React. Entry point: `src/main.tsx`. |
| Data fetching | `useGateways` hook polls `https://mapper.packetbroker.net/api/v2/gateways` once and caches the result in React state. |
| Map rendering | `components/MapView.tsx` wraps MapLibre GL, clustering gateways, handling clicks, and syncing focus. |
| Dashboard UI | `App.tsx` orchestrates light/dark theming, filtering, legend segment, gateway detail modal, and location search. |
| Deployment | GitHub Pages via `.github/workflows/pages.yml` builds with `npm run build` and publishes `dist/`. |

## Key Files

- `src/App.tsx` – main layout, theme toggle, network filters, legend, and modal.
- `src/components/MapView.tsx` – MapLibre setup and gateway cluster logic.
- `src/components/LocationSearch.tsx` – Photon-powered location search input.
- `src/hooks/useGateways.ts` – Fetches and stores Packet Broker gateways.
- `src/index.css` – theme variables, global styles, glass panel styling.
- `tailwind.config.js` – colors, font families (Inter + League Spartan), and Tailwind extensions.

## Development

```bash
npm install
npm run dev
```

- Local dev runs on http://localhost:5173 (`vite.config.ts`).
- Toggle light/dark mode via the pill in the top-left card.

## Building

```bash
npm run build
```

Outputs a production bundle under `dist/`. The `base` path is `/ttnmap/` to support GitHub Pages hosting.

## Deployment

Pushes to `main` trigger the `Deploy to GitHub Pages` workflow:

1. Checkout and install dependencies (Node 20).
2. Run `npm run build`.
3. Upload `dist/` as an artifact and deploy via `actions/deploy-pages@v4`.

Configure Pages under the repo’s **Settings → Pages** (source: GitHub Actions). The site publishes to `https://thethingsnetwork.github.io/ttnmap/`.

## Data Sources

- Packet Broker gateways: `https://mapper.packetbroker.net/api/v2/gateways`
- Photon geocoder: `https://photon.komoot.io`

Both endpoints are public; no secrets or credentials are stored in the repo.
