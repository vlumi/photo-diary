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
