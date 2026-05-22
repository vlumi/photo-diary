# Photo Diary React App

The front-end SPA for the Photo Diary, served by the [server](../server) in production and developed against a [Vite](https://vite.dev) dev server. Written in TypeScript with strict mode.

## Requirements

- [Node.js](https://nodejs.org) 22 or newer; npm 10+ recommended
- A running Photo Diary [server](../server) — the dev server proxies `/api/*` to `http://localhost:4200`

## Running Instructions

```sh
npm install        # from the repo root (npm workspaces; installs every package)
npm run dev        # Vite dev server on http://localhost:3000 — from react-app/
npm run build      # Production build into build/ (Rolldown) — from react-app/
npm run preview    # Serve the production build locally — from react-app/
npm test           # vitest run — from react-app/
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
```

For production, run `npm run build` from the **repo root**: it builds the react-app workspace and copies `build/` into [server](../server)/`build/` so the server can serve it.

### Configuration

The frontend has no build-time environment variables — one build serves every instance. Defaults live as plain values in [`src/lib/config.ts`](src/lib/config.ts) and per-instance behavior comes from the API at boot.

Set these on the **server's** `.env` (per instance) to override the defaults; the server returns them through `/api/v1/meta` and the frontend applies them when the meta loads:

- `DEFAULT_GALLERY` — gallery to redirect to from `/g` when no other heuristic (single-gallery, hostname match) picks one
- `DEFAULT_THEME` — fallback theme when a gallery row has no `theme` set
- `INITIAL_GALLERY_VIEW` — `year` / `month` / `day` / `photo` fallback when a gallery row has no `initial_view` set
- `FIRST_WEEKDAY` — `0` (Sunday) or `1` (Monday); affects the year-view calendar grid

Per-gallery values (`theme`, `initial_view`, `hostname`) on each gallery row in the DB take precedence over the instance-level defaults above.

`PHOTO_ROOT_URL` is overridden the same way via the `instance_cdn` meta row (set with `bin/` tools or directly in the DB).

`DEFAULT_LANGUAGE` is the one value that **can't** be overridden at runtime — i18next initializes at module load, before the meta fetch. Edit the literal in `config.ts` if you need a different fallback language for new visitors. Users' own selections are persisted via the `lang` localStorage key.

Available themes: `blue`, `red`, `grayscale`, `bw`, `alert` (defined in `src/lib/theme.ts`). Supported languages: `en`, `fi`, `ja`.

## Structure

- `src/index.tsx` — entry, mounts `<App>` inside `React.StrictMode`
- `src/App.tsx` — routes (`react-router-dom` 7), top menu, country-locale registration, persisted-user bootstrap
- `src/components/` — UI components
  - `Gallery/` — gallery shell + `Year/Month/Day/Photo/Filters/Stats` sub-views
  - `MapContainer.tsx` — Leaflet map wrapper used by the various Footer components
  - `TopMenu.tsx`, `Login.tsx`, `Logout.tsx` — auth-aware top bar
- `src/models/` — `PhotoModel`, `GalleryModel`, `UserModel` (functional constructors returning typed closures)
- `src/services/` — thin `fetch` wrappers around the server's `/api/v1/*` endpoints
- `src/lib/` — pure helpers (`calendar`, `collection`, `color`, `config`, `filter`, `format`, `i18n`, `stats`, `theme`, `keypress`, `scroll`, `token`, `api`)
  - `stats.tsx` is the largest module — aggregates photo statistics into chart-ready data and table rows
- `src/setupTests.ts` — vitest setup (registers `@testing-library/jest-dom` matchers)

## Bundle shape

Production build produces four JS chunks plus a single small entry CSS file and one large per-chunk CSS file for the map:

| Chunk | Raw | gzipped | What |
| --- | --- | --- | --- |
| `index-*.js` (main) | ~444 kB | ~143 kB | React + react-dom, react-router, i18next, i18n-iso-countries, Emotion, our `src/` code (gallery shell + calendar views) |
| `MapContainer-*.js` | ~198 kB | ~60 kB | Leaflet + react-leaflet + leaflet.markercluster — shared lazy chunk loaded on first map render |
| `Stats-*.js` | ~210 kB | ~72 kB | chart.js + react-chartjs-2 + the stats-aggregation src — loaded on `/g/:id/stats` only |
| `Photo-*.js` | ~7 kB | ~3 kB | single-photo view src — loaded when opening a photo |
| `index-*.css` (main) | ~0.4 kB | ~0.2 kB | global tokens + body resets from `App.css` (see "CSS approach" below) |
| `MapContainer-*.css` | ~17 kB | ~7 kB | leaflet + markercluster stylesheets, follows the MapContainer JS chunk |

Code-splitting boundaries live in [`components/Gallery/index.tsx`](src/components/Gallery/index.tsx) (`Stats` + `Photo` via `React.lazy`) and [`components/MapContainer.lazy.tsx`](src/components/MapContainer.lazy.tsx) (a wrapper that swaps every `MapContainer` import for one shared lazy chunk so leaflet is downloaded only when a map actually renders). Suspense boundaries in each consumer give the map a fixed-height placeholder so the page doesn't reflow when the chunk arrives.

To inspect the chunk composition yourself:

```sh
ANALYZE=1 npm run build
open build/bundle-stats.html
```

That writes a `rollup-plugin-visualizer` treemap (gzipped + brotli sizes) into the build output. The env var is opt-in so regular production builds stay clean.

### Heaviest deps and the case for each

These are the biggest items in the bundle and why they're here (or could go):

| Dep | gz | Notes |
| --- | --- | --- |
| `react` + `react-dom` | ~85 kB | unavoidable, framework baseline |
| `chart.js` | ~89 kB | only in the Stats chunk; the stats page draws several chart types. Replaceable in principle with a smaller lib (uPlot, Chartist) or hand-rolled SVG, but well-tested and the size is paid only by visitors who actually open `/stats`. |
| `leaflet` + `react-leaflet` + `markercluster` | ~70 kB | shared lazy chunk; only fetched on first map render. Big but functionally hard to substitute for. |
| `react-router` | ~22 kB | core navigation |
| `i18next` + `react-i18next` | ~21 kB | i18n runtime |
| `i18n-iso-countries` (en + fi + ja JSONs) | ~12 kB | three locale dictionaries eagerly imported in `App.tsx`. Lazy-loading only the active language is a clear win (~8 kB gz reclaim) but belongs with the broader i18n architecture pass in #220. |
| `@emotion/*` (cache + styled + react + serialize + is-prop-valid + stylis) | ~14 kB | CSS-in-JS runtime; see below |

## CSS approach

Two stylesheets in source, two responsibilities:

- **[`src/App.css`](src/App.css)** — global tokens + body resets only (~30 lines). Defines CSS custom properties used by every theme, plus `<body>` font/color/background, anchor color, and a couple of error-state classes. No component styles.
- **[Emotion](https://emotion.sh)** (`@emotion/styled` + `@emotion/react`'s `css` template + `<Global>`) — everything component-specific. ~38 files use it. Each component owns its visual styles inline via `styled.div` tagged templates; theming flows through props or `useTheme`.

The split is intentional: tokens and global resets in plain CSS (no JS overhead on first paint), component styles in JS-co-located form where they're easiest to maintain. No CSS preprocessor, no CSS modules.

Migration to a different system (vanilla-extract, Tailwind, etc.) is **not currently planned** — Emotion's runtime cost is ~14 kB gz and the consistency win across 38 component files is real. If the bundle audit revisits the question, that's a separate ticket to file.
