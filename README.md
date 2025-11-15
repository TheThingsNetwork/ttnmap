# TTN Gateway Atlas

Interactive map that visualizes live gateway telemetry from Packet Broker. Built with React, Vite, and MapLibre.

## Features

- Real-time gateway list fetched directly from Packet Broker.
- MapLibre map with light/dark mode toggle and network filters.
- Gateway details modal containing IDs, location, and status information.
- Location search powered by Photon.
- GitHub Pages deployment via GitHub Actions.

## Development

```bash
npm install
npm run dev
```

## Build & Deploy

```bash
npm run build
```

Pushing to `main` triggers the GitHub Pages workflow defined in `.github/workflows/pages.yml` to publish the `dist/` output.

## Data Sources

- Gateways: https://mapper.packetbroker.net/api/v2/gateways
- Geocoding: https://photon.komoot.io
