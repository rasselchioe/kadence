# Kadence

Editorial cycling-analytics for one rider.

Kadence is a private, single-user GPX cycling archive. Upload a `.gpx`; the
server parses it into a ride + trackpoints + computed metrics and renders the
result as an editorial dashboard: map, elevation profile, splits, climbs,
charts, and optional weather. No feed. No followers. No leaderboards.

> **Status:** early build. The design system + GPX analytics core are in place;
> auth, persistence, and the full UI land in later milestones (see the build
> spec). The backend (Supabase) is intentionally not wired yet.

## Screens

_Screenshots land as the UI milestones ship: landing, dashboard, upload preview,
activity, trends, dark mode, error state._

## Stack

Next.js 15 (App Router, RSC) · TypeScript (strict) · Tailwind CSS 3.4 ·
shadcn/ui · Zod · Drizzle + Postgres (Supabase) · Supabase Auth + Storage ·
MapLibre GL · Turf.js · `fast-xml-parser` · Recharts · Vitest + Playwright.

## Local setup

```bash
pnpm install
cp .env.example .env.local        # fill in once Supabase is wired
pnpm dev                          # http://localhost:3000
```

Quality gates:

```bash
pnpm lint
pnpm typecheck
pnpm test                         # Vitest unit suites (GPX parser, units)
```

> This repo uses **pnpm** via Corepack. If `pnpm` isn't on your PATH, run it as
> `corepack pnpm <cmd>` or `corepack enable`.

## Architecture

- **Routes + RSC** — App Router. Server Components by default; client only for
  charts and the map. Mutations are server actions.
- **Parsing pipeline** — `lib/gpx/parse.ts` normalizes trackpoints, computes
  cumulative distance (haversine), smooths elevation, then derives metrics,
  per-km splits, and detected climbs. See `lib/gpx/`.
- **Storage layout** — `gpx/<userId>/<rideId>.gpx` (private bucket), planned.

## Roadmap

- FIT file import
- Strava OAuth import (opt-in)
- Route planning via OpenRouteService
- Public ride sharing (per-ride permalinks)

## Credits

Map tiles © OpenStreetMap contributors. Weather © Open-Meteo.
