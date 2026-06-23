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

Per-instance runtime defaults are edited from `/m/instance` (admin UI) or `bin/meta.ts` and stored in the server's `meta` table — the server returns them through `/api/v1/meta` and the frontend applies them when the meta loads. The keys (without their internal `instance_` prefix):

- `defaultGallery` — gallery to redirect to from `/g` when no other heuristic (single-gallery, hostname match) picks one
- `defaultTheme` — fallback theme when a gallery row has no `theme` set
- `initialGalleryView` — `year` / `month` / `day` / `photo` fallback when a gallery row has no `initial_view` set
- `firstWeekday` — `0` (Sunday) or `1` (Monday); affects the year-view calendar grid
- `defaultLanguage` — fallback display language; seeds new galleries' `default_language` column at create time
- `betaFeatures` — JSON-encoded `{name: "on" | "off" | "user"}` map for per-instance beta-feature locks
- `cdn` — public URL prefix for `display/` / `thumbnail/` / `gallery-icons/`
- `knownHosts` — JSON array of `{hostname, label, isMain}` entries powering the UserMenu virtual-host switcher (#664). One entry should set `isMain: true` — that's the host the SPA hits to mint cross-host SSO tokens.

Per-gallery values (`theme`, `initial_view`, `hostname`, `default_language`) on each gallery row in the DB take precedence over the instance-level defaults above.

Available themes are defined in [`src/lib/theme.ts`](src/lib/theme.ts) — currently 18 entries across the Coloured, Neutral, Dark, and Showcase groups. Supported languages: `en`, `fi`, `ja`.

## Internationalization (i18n)

UI strings live in [`src/lib/translations/`](src/lib/translations/) as one flat JSON per language. Keys use hyphens (`stats-col-camera`) and i18next runs with `keySeparator: false` so dots in values don't trigger nested lookups. `fallbackLng: "en"` covers any key missing from `fi` / `ja`.

Plurals use the CLDR-style `_one` / `_other` suffixes that i18next v4 expects (i18next 21+). Translators add the suffixed variants and callers pass `t("photo-count", { count })`; the resolver picks the right form per the active language's plural rules. Japanese uses only `_other` (CLDR has no `_one` category for `ja`).

Country names come from [`i18n-iso-countries`](https://www.npmjs.com/package/i18n-iso-countries) — its per-language JSON dictionaries are dynamic-imported in [`App.tsx`](src/App.tsx) so each language ships as its own ~2 kB gz chunk instead of all three being eagerly pulled into the main bundle. A loading placeholder renders briefly the first time a language's dictionary is fetched; switching back to a previously loaded language is instant (registered locales are cached in the singleton).

## Structure

- `src/index.tsx` — entry, mounts `<App>` inside `React.StrictMode`
- `src/App.tsx` — routes (`react-router-dom` 7), top menu, country-locale registration, persisted-user bootstrap
- `src/components/` — UI components
  - `Gallery/` — gallery shell + `Year/Month/Photo/Filters/Stats` sub-views (Day was folded into Month in 0.10)
  - `Manage/` — admin surface (lazy-loaded out of the main bundle): `Galleries` / `GalleryEdit` / `GallerySourcesSection` / `VirtualGalleryFilterSection` / `SavedFiltersSection`, `Users` / `UserEdit`, `Groups` / `GroupEdit`, `Access`, `Photos` / `PhotoDrawer`, `Dashboard`, `Operations`, `Instance`, plus the shared `ItemModal` / `Section` primitives
  - `GlobalStats/` — instance-wide stats view
  - `MapContainer.tsx` (+ `.lazy.tsx`) — Leaflet wrapper, lazy-loaded across consumers
  - `TopMenu.tsx`, `Login.tsx`, `UserMenu.tsx` — auth-aware top bar
- `src/models/` — `PhotoModel`, `GalleryModel`, `UserModel` (functional constructors returning typed closures)
- `src/services/` — thin `fetch` wrappers around the server's `/api/v1/*` endpoints
- `src/lib/` — pure helpers and hooks (`api`, `api-schema`, `calendar`, `collection`, `color`, `config`, `country-sentinel`, `crop-factors.json`, `filter`, `format`, `host-scope` / `use-host-scope`, `i18n`, `id-shape`, `keypress`, `stats` / `stats-adapter`, `theme`, `token`, `uniqueValues`, `useBodyScrollLock`, `useFilteredCalendar`, `useMediaQuery`)
  - `stats.tsx` is the largest module — aggregates photo statistics into chart-ready data and table rows
  - `api-schema.ts` is regenerated from the server's OpenAPI dump via `npm run api:codegen`; don't edit by hand
- `src/stores/` — Zustand stores (filter, dateRange, numericRanges, etc.); `useWireNumericRanges` strips the client-only anchor field before wire submission
- `src/setupTests.ts` — vitest setup (registers `@testing-library/jest-dom` matchers)

## Bundle shape

Production build splits across many chunks (Manage admin views, GalleryForm, Photos drawer, etc. are individually lazy). Approximate current sizes — rerun `npm run build` for ground truth:

| Chunk | Raw | gzipped | What |
| --- | --- | --- | --- |
| `index-*.js` (main) | ~361 kB | ~108 kB | React + react-dom, react-router, i18next, i18n-iso-countries runtime, Zustand, our `src/` code (gallery shell + calendar views) |
| `Stats-*.js` | ~234 kB | ~79 kB | chart.js + react-chartjs-2 + the stats-aggregation src — loaded on `/g/:id/stats` only |
| `api-*.js` | ~192 kB | ~56 kB | shared openapi-fetch typed client + generated `api-schema.ts` |
| `marker-icon-2x-*.js` + `MapContainer-*.js` | ~200 kB | ~62 kB | Leaflet + react-leaflet + leaflet.markercluster — shared lazy chunk loaded on first map render |
| `Photo-*.js` | ~140 kB | ~45 kB | single-photo view src — loaded when opening a photo |
| `Galleries-*.js` | ~50 kB | ~16 kB | Manage admin Galleries list |
| `emotion-styled.browser.esm-*.js` | ~40 kB | ~16 kB | Emotion styled runtime |
| `GalleryForm-*.js` | ~34 kB | ~10 kB | gallery create/edit form (real / hybrid / saved-filter) |
| `Photos-*.js` | ~33 kB | ~10 kB | Manage admin Photos drawer |
| `en-*.js` / `fi-*.js` / `ja-*.js` | ~3–17 kB | ~2–7 kB | country-name dictionaries from `i18n-iso-countries`, one chunk per language, fetched on first activation |
| `index-*.css` (main) | ~0.4 kB | ~0.2 kB | global tokens + body resets from `App.css` (see "CSS approach" below) |
| `MapContainer-*.css` + `marker-icon-2x-*.css` | ~17 kB | ~7 kB | leaflet + markercluster stylesheets, follow the MapContainer JS chunks |

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
| `i18n-iso-countries` runtime | ~5 kB | the registration/lookup core stays in main; per-language dictionaries are split into their own chunks (`en/fi/ja-*.js`) and fetched on demand. See the "Internationalization" section above. |
| `@emotion/*` (cache + styled + react + serialize + is-prop-valid + stylis) | ~14 kB | CSS-in-JS runtime; see below |

## CSS approach

Two stylesheets in source, two responsibilities:

- **[`src/App.css`](src/App.css)** — global tokens + body resets only (~30 lines). Defines CSS custom properties used by every theme, plus `<body>` font/color/background, anchor color, and a couple of error-state classes. No component styles.
- **[Emotion](https://emotion.sh)** (`@emotion/styled` + `@emotion/react`'s `css` template + `<Global>`) — everything component-specific. ~38 files use it. Each component owns its visual styles inline via `styled.div` tagged templates; theming flows through props or `useTheme`.

The split is intentional: tokens and global resets in plain CSS (no JS overhead on first paint), component styles in JS-co-located form where they're easiest to maintain. No CSS preprocessor, no CSS modules.

Migration to a different system (vanilla-extract, Tailwind, etc.) is **not currently planned** — Emotion's runtime cost is ~14 kB gz and the consistency win across 38 component files is real. If the bundle audit revisits the question, that's a separate ticket to file.
