# Changelog

## [Unreleased]

### Features

- Privacy toggle for the map and photo coordinates. Set via the existing `acl` table's new `hide_map` column — the four-cell cascade picks the most specific row with a non-null value: `(user, gallery)` > `(user, ':all')` > `(':guest', gallery)` > `(':guest', ':all')`. Both layers fire: the server strips `coord_lat`/`coord_lon`/`coord_alt` from the photo payload when hidden (so there's no data to leak), and the gallery payload gains a `hideMap` boolean that the frontend uses to skip rendering the map widget. Schema migration 003 adds the column; existing deploys pick it up automatically on next server start. To hide for unauthenticated visitors only: `UPDATE acl SET hide_map = 1 WHERE user_id = ':guest' AND gallery_id = ':all'`. (closes #159)

### Cross-package

- Rename and relocate the operator scripts. They lose the misleading `add-` prefix (they were upserts, never just creates) and gain a more accurate bare-noun naming: `add-photo.ts` → `photo.ts`, `add-gallery.ts` → `gallery.ts`, `add-user.ts` → `user.ts`, `init-instance.ts` → `instance.ts`. `instance.ts` (no project deps — pure Node) moves to `bin/instance.ts` at the repo root, where it's invoked directly with the absolute path of the version you want for bootstrap / upgrade (`/opt/photo-diary/<version>/bin/instance.ts <name>`). The other three (`photo`, `gallery`, `user`) stay in `server/bin/` since they import the server's DB / logger / etc. The `instance` script populates a per-instance `<instance>/bin/{photo,gallery,user}.ts` directory of symlinks on init / doctor / upgrade, each pointing at `<instance>/code/server/bin/<name>.ts`, so the day-to-day commands inside an instance dir become `./bin/photo.ts …` instead of `./code/server/bin/add-photo.ts …`. The `.ts` extension is kept on the symlinks so editors recognise them as TS source via realpath; a small root-level `tsconfig.json` (extends `server/tsconfig.json`) covers `bin/instance.ts` itself, and the root `package.json` gains `"type": "module"` so NodeNext treats it as ESM. Docs updated throughout.
- Switch to npm workspaces. New top-level `package.json` lists `server`, `converter`, and `react-app` as workspaces and exposes `npm run setup` (install + build) and `npm run build` (build react-app and copy into `server/build/`) at the repo root. Replaces the previous per-package install ritual and the `server/build:ui` script. Single root `package-lock.json` replaces the three per-package lockfiles. CI workflow updated to install once at the root and run lint/typecheck/test per workspace.
- Add `server/bin/init-instance.ts` for bootstrapping and upgrading multi-instance deploys: creates the directory tree, generates `.env` with a fresh random `SECRET`, creates a `code` symlink in the instance dir pointing at the running version's code root. Re-runs are idempotent — same code root acts as a doctor and reports missing `.env` keys (`--fix` appends defaults), different code root acts as an upgrade and backs up the DB to `db.sqlite3.pre-<new-version>` before flipping the symlink. Same script handles every lifecycle event for an instance.
- **Breaking (deployment):** drop the `PHOTO_ROOT_DIR` and `DB_OPTS` env vars. The photo repository now lives at the fixed path `<instance-dir>/photos/` and the SQLite DB at `<instance-dir>/db.sqlite3` — both relative to the server's / converter's working directory (the instance directory when launched via `start-prod.sh`). Existing deploys: rename `<instance>.sqlite3` → `db.sqlite3` in each instance dir; symlink `<instance>/photos` (or the whole instance dir) if the photos live elsewhere, e.g. `ln -s /mnt/data/dailybw /var/photo-diary/dailybw/photos`. Remove the two now-inert lines from each instance's `.env`.
- Add `server/bin/start-prod.sh` and `converter/bin/start-prod.sh` wrappers: each sources `.env` from the current working directory and derives the pm2 process name from `INSTANCE_NAME` (`<name>` and `<name>-converter`). Symlink-resilient — invoke via the instance dir's `code/server/bin/start-prod.sh` and they still locate their own code root correctly. The `prod` npm script in both packages now invokes the wrapper. Single-instance use stays the same — without an `INSTANCE_NAME`, the pm2 names fall back to `photo-diary-server` / `photo-diary-converter`. `start-dev.sh` siblings give the same instance-dir layout for foreground `tsx watch` dev runs.
- Document the multi-instance deploy pattern in the top-level README: versioned code under `/opt/photo-diary/<version>/`, host prep via `tar --strip-components=1` from the GitHub source tarball, per-instance directories under `/var/photo-diary/<name>/` with their own `.env`, `code` symlink, photos, and SQLite DB, nginx vhost per instance, atomic upgrade via the `init-instance` script.

### Server

- Replace the `uuid` dep with the built-in `crypto.randomUUID()`
- Send `X-Robots-Tag: noindex, noai, noimageai` on every response, including served photo files
- Add a DB migration runner that uses `meta.schema_version` as the cursor; runs at server startup against the better-sqlite3 driver. Bootstraps fresh DBs from `db/sqlite3/migrations/001_baseline.sql`, then advances to v2 via `002_fix_gallery_photo_fk.sql` which rebuilds `gallery_photo` with the correct singular FK references (the long-standing `photos`/`galleries` typo). Drops the obsolete `schema/sqlite3.ddl`, `schema/migrate/sqlite3_from_0.ddl`, and `migrate_legacy_to_sqlite3.sh`.
- Resolve the bundled-frontend static directory from `import.meta.dirname` (with `STATIC_DIR` override) so the server can be started from any working directory — needed for the multi-instance deploy where the code lives at a shared path and each instance has its own CWD.

### Frontend

- Replace `mathjs` with inline native `mean`/`stddev` helpers in `stats.tsx`; production bundle drops ~40% (1.5 MB → 876 kB raw, 460 kB → 282 kB gzipped)
- Drop `react-helmet-async` in favor of React 19's native `<title>`/`<meta>` hoisting (6 call sites)
- Enumerate AI-training bots explicitly in `robots.txt` (GPTBot, Google-Extended, ClaudeBot, PerplexityBot, CCBot, etc.) for crawlers that ignore the `User-agent: *` wildcard
- Drop the six `VITE_*` build-time env vars; defaults live in `lib/config.ts` and `Gallery/index.tsx` applies runtime overrides from `/api/v1/meta` (`defaultGallery`, `defaultTheme`, `initialGalleryView`, `firstWeekday`) on top of the existing `cdn` → `PHOTO_ROOT_URL` path, so one frontend build serves any instance
  - **Breaking (deployment):** per-instance overrides move from `react-app/.env` to the **server's** `.env`. Rename `VITE_DEFAULT_GALLERY` → `DEFAULT_GALLERY`, `VITE_THEME` → `DEFAULT_THEME`, `VITE_INITIAL_GALLERY_VIEW` → `INITIAL_GALLERY_VIEW`, `VITE_FIRST_WEEKDAY` → `FIRST_WEEKDAY` in each deployed instance's `server/.env`. `VITE_PHOTO_ROOT_URL` should already be using the `instance_cdn` meta row. `VITE_DEFAULT_LANGUAGE` doesn't map — change the literal in `lib/config.ts` if you need a different fallback; i18next initializes before meta loads.

## [0.6.0] - 2026-05-19

### Features

- Add map to statistics page
- Cluster closely grouped markers on the map

### Server

- Replace jsonwebtoken with jose to unblock Node 26
- Upgrade test infrastructure (jest 29, supertest 7, nodemon 3)
- Upgrade runtime dependencies (bcrypt 6, dotenv 17, uuid 11, cross-env 10, etc.)
- Upgrade to Express 5
- Upgrade ESLint to v9 with flat config
- Migrate to ESM (vitest replaces jest, drops cross-env and nodemon)
- Swap sqlite3 for better-sqlite3 (sync API, simpler driver code)
  - **Heads-up (long-lived DBs):** better-sqlite3 enables `PRAGMA foreign_keys = ON` by default, whereas the old `sqlite3` driver left it off. If your prod DB was bootstrapped from the legacy schema, the `gallery_photo` foreign keys point at `photos(id)` / `galleries(id)` (plural) instead of the actual `photo` / `gallery` tables, and every mutation now fails with `no such table: main.galleries`. Fix by rebuilding the table on the prod DB with corrected references (back up first): `CREATE TABLE gallery_photo_new (gallery_id TEXT, photo_id TEXT, PRIMARY KEY(photo_id, gallery_id), FOREIGN KEY(photo_id) REFERENCES photo(id), FOREIGN KEY(gallery_id) REFERENCES gallery(id)); INSERT INTO gallery_photo_new SELECT * FROM gallery_photo; DROP TABLE gallery_photo; ALTER TABLE gallery_photo_new RENAME TO gallery_photo;` — wrap in `PRAGMA foreign_keys=OFF; BEGIN; … COMMIT; PRAGMA foreign_key_check; PRAGMA foreign_keys=ON;`.
- Migrate to TypeScript (strict mode, tsx runtime)
- Type SQLite row shapes per table in the db layer; drop the `Record<string, any>` escape hatches
- Tighten `tsconfig.json`: drop `allowJs`/`checkJs` now that no `.js` source remains
- Quieten dotenv 17 "tip" output in tests via `DOTENV_CONFIG_QUIET=true`; keep production on side-effect `import "dotenv/config"` so `.env` loads during import resolution
- Make `bin/add-user.ts`, `bin/add-gallery.ts`, `bin/add-photo.ts` directly runnable via a `#!/usr/bin/env -S npx tsx` shebang (no more `npx tsx bin/…` prefix needed from `server/`)

### Converter

- Upgrade dependencies (jest 29, nodemon 3, dotenv 17, etc.)
- Upgrade ESLint to v9 with flat config
- Migrate to ESM + TypeScript (chokidar 4, image-size 2)
- Replace `gm` with `sharp`; image processing is ~20× faster on real-size photos
  - **Breaking (deployment):** the converter no longer requires the ImageMagick (or GraphicsMagick) CLI on the host — sharp ships its own libvips bindings via npm. You can `apt-get remove imagemagick` (or equivalent) on the converter host. CI's converter job no longer installs imagemagick.

### Frontend (react-app)

- Replace CRA with Vite + Vitest; swap react-helmet for react-helmet-async, axios for native fetch, drop date-diff
  - **Breaking (deployment):** frontend env vars in `react-app/.env` (and any per-environment `.env`) renamed from `REACT_APP_*` to `VITE_*`. Update each deployed environment's config: `REACT_APP_PHOTO_ROOT_URL` → `VITE_PHOTO_ROOT_URL`, `REACT_APP_THEME` → `VITE_THEME`, `REACT_APP_DEFAULT_LANGUAGE` → `VITE_DEFAULT_LANGUAGE`, `REACT_APP_DEFAULT_GALLERY` → `VITE_DEFAULT_GALLERY`, `REACT_APP_INITIAL_GALLERY_VIEW` → `VITE_INITIAL_GALLERY_VIEW`, `REACT_APP_FIRST_WEEKDAY` → `VITE_FIRST_WEEKDAY`. Old names are silently ignored at build time.
- Warm-up dep refresh: jose 4→6, mathjs 10→15, react-icons 4→5, geo-coord 0.1→0.2, jsdom 25→27, globals 16→17, vitest 2→3. Drop unused `@testing-library/user-event`.
- Upgrade to React 18 with coupled deps: react/react-dom/react-is 17→18, react-helmet-async 1→2, react-leaflet 3→4, react-leaflet-markercluster 3→4, react-chartjs-2 3→4, react-i18next 11→14 with i18next 21→23, react-swipeable 6→7, @testing-library/react 12→14
- Upgrade `react-router-dom` 5→7 (skips intermediate v6): `Switch` → `Routes`, `element` prop replaces children, `Redirect` → `Navigate` with explicit `replace`
- Upgrade to React 19 with coupled deps: react/react-dom/react-is 18→19, react-helmet-async 2→3, react-leaflet 4→5, react-leaflet-markercluster 4→5.0.0-rc.0, react-chartjs-2 4→5 with chart.js 3→4, react-i18next 14→17 with i18next 23→26, @testing-library/react 14→16
- Swap `styled-components` for `@emotion/styled` (37 files); the one `createGlobalStyle` site converts to emotion's `Global` component
- Migrate to strict TypeScript across source and tests (8-PR incremental migration covering setup, lib, models, services, stats, components, and tests); drop `prop-types` runtime dep and `allowJs`
- Export `StatsTopic` / `StatsCategory` / `KpiItem` / `ChartSpec` / `TableColumn` / `TableRow` / `UniqueValues` types from `lib/stats`; replaces ~25 `any` annotations threading through Gallery, Filters, and Stats components
- Upgrade Vite 6→8 and `@vitejs/plugin-react` 4→5; production build ~4× faster via Rolldown

### Cross-package

- Add GitHub Actions CI for server, converter, and react-app
- Refresh server and converter dependencies to latest majors: vitest 4, uuid 14, jose 6, yargs 18, TypeScript 6, ESLint 10, chokidar 5, `@types/*` packages
- Patch-bump server and converter dev deps: `@types/node` 25.8→25.9, `tsx` 4.22.1→4.22.2, `typescript-eslint` 8.59.3→8.59.4

## [0.5.1] - 2022-05-02

- Add aspect ratio to statistics
- Fix orientation to keep all values in stats table even when filtered
- Upgrade to react-scripts 5

## [0.5.0] - 2021-12-23

- Add version number (v1) to API path
- Remove support for the old legacy_sqlite3 DB schema
- Add instance metadata API and backing DB
  - Remove the unused legacy SCHEMA_INFO table
  - Add the META table
  - Add new RESTful end-point `/api/v1/meta`
- Use `cdn` from meta as the default photo root URL
- Display the `name` and `description` from meta on the gallery list page
- Fix empty title to be a link to the gallery list

## [0.4.2] - 2021-02-26

- Upgrade all dependencies to latest, including React 17

## [0.4.1] - 2020-08-21

- UI tweaks and fixes
- Major code refactoring
  - Re-organize code hierarchy
  - Switch to using styled components
  - Better unit test coverage

## [0.4.0] - 2020-08-03

- Photo property filters
  - Filter the content by photo properties in any of the topics and categories of statistics
    - General: author, country
    - Time: year/month, year, month, weekday, hour
    - Gear: camera make, camera, lens, camera/lens
    - Exposure: focal length, aperture, shutter speed, sensitivity, EV, LV, resolution
  - Filters within a category are additive, matching all photos that match any of them
  - Filters across categories are subtractive, matching photos that match the filters in all categories
  - Set filters apply in all views
    - Gallery and statistics
  - Filters can be added and cleared in all views
    - Toolbar in all views
    - Clicking on individual values on statistics tables

## [0.3.0] - 2020-07-31

- Statistics view
  - Separate for each gallery, including virtual
- Marker paths to embedded map, in chronological order
- API changes
  - Remove `/api/stats`, moving the statistics generation client-side
  - Flatten the returned `photos` in `/api/gallery`, removing the year/month/day hierarchy

## [0.2.1] - 2020-07-27

- Embedded map with markers of the photo(s) on year, month, day, and photo views
  - Marker popup with small thumbnail and date
  - No grouping of nearby markers
- Language selection and minimal localization
  - English, Finnish, Japanese

## [0.2.0] - 2020-07-25

- Implement new `sqlite3` schema and driver
  - More photo and gallery metadata
  - User and ACL information
  - CRUD
- Implement authentication and authorization
- Implement new command-line tools for managing the DB content, under `server/bin/`
  - `add-user.js`
    - Add a new, or update an existing user
    - ID, password, and ACL information from command-line parameters
  - `add-gallery`
    - Add a new, or update an existing gallery
    - Properties from command-line parameters
  - `add-photo.js`
    - Add new, or update existing photos
    - Input from the JSON produced by [converter](converter) and command-line parameters
    - Also set galleries (unlink & link)
  - Any other management should be done directly to the DB
    - Admin UI is in the pipeline

## [0.1.1] - 2020-07-20

- Usability improvements and polish
- Setup to run in production mode

## [0.1.0] - 2020-07-18

- New front-end app
  - Read-only views for browsing/viewing
    - Front page with list of galleries
      - Can be skipped by setting a default gallery
    - Year view
      - Optionally all years by setting the year parameter negative
      - Calendar layout, with days heat-mapped by number of photos
    - Month view
      - Photos group by day, same as [gallery](https://github.com/vlumi/gallery)
    - Day view
      - Same as month view, but restricted to a single day
    - Single photo view
      - A single photo in larger size with properties
- Back-end API
  - RESTful JSON API
  - Abstract DAO layer for future DB migration
    - Legacy [gallery](https://github.com/vlumi/gallery), read-only DB driver
    - Dummy DB driver for unit tests
  - Currently unused features already implemented
    - Token-based user and access control
    - More photo metadata
- Dependent on parts of [gallery](https://github.com/vlumi/gallery)
  - DB
  - Admin tools
  - Statistics

## Initial commit - 2020-07-04

[Unreleased]: https://github.com/vlumi/photo-diary/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/vlumi/photo-diary/compare/v0.5.1...v0.6.0
[0.5.1]: https://github.com/vlumi/photo-diary/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/vlumi/photo-diary/compare/v0.4.2...v0.5.0
[0.4.2]: https://github.com/vlumi/photo-diary/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/vlumi/photo-diary/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/vlumi/photo-diary/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/vlumi/photo-diary/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/vlumi/photo-diary/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/vlumi/photo-diary/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/vlumi/photo-diary/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/vlumi/photo-diary/releases/tag/v0.1.0
