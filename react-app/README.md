# Photo Diary React App

The front-end SPA for the Photo Diary, served by the [server](../server) in production and developed against a [Vite](https://vite.dev) dev server. Written in TypeScript with strict mode.

## Requirements

- [Node.js](https://nodejs.org) 22 or newer; npm 10+ recommended
- A running Photo Diary [server](../server) — the dev server proxies `/api/*` to `http://localhost:4200`

## Running Instructions

```sh
npm install
npm run dev        # Vite dev server on http://localhost:3000
npm run build      # Production build into build/ (Rolldown)
npm run preview    # Serve the production build locally
npm test           # vitest run
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
```

For production the build is copied into [server](../server)/build/ via `npm run build:ui` (from the server directory) and served by the server.

### Environment Variables

Configured in `react-app/.env` (or a per-environment file like `.env.production`). Vite only exposes variables prefixed with `VITE_` to the client.

- `VITE_PHOTO_ROOT_URL` \*
  - The public URL serving the physical photos, with the following sub-directories:
    - `display/` – display-size photos
    - `thumbnail/` – thumbnail-size photos
  - Can be overridden at runtime by the instance metadata `cdn` value served from the server's `/api/v1/meta` endpoint.
- `VITE_THEME` (default: `blue`)
  - Built-in color theme. Defined in `src/lib/theme.ts`. Currently available:
    - `blue`
    - `red`
    - `grayscale`
    - `bw`
    - `alert`
- `VITE_DEFAULT_LANGUAGE` (default: `en`)
  - Initial UI language before a stored selection takes over. Supported: `en`, `fi`, `ja`.
- `VITE_DEFAULT_GALLERY`
  - If set, accessing `/g` (or the site root, which redirects to `/g`) redirects to this gallery instead of the gallery list.
- `VITE_INITIAL_GALLERY_VIEW` (default: `month`)
  - The view to land on when entering a gallery: `year` / `month` / `day` / `photo`.
- `VITE_FIRST_WEEKDAY` (default: `1` — Monday)
  - The first day of the week for the year-view calendar grid. `1` = Monday, `0` = Sunday.

\* Required; everything else falls back to the listed default.

## Structure

- `src/index.tsx` — entry, mounts `<App>` inside `HelmetProvider` and `React.StrictMode`
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
