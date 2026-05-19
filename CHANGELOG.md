# Changelog

## [Unreleased]

- Add map to statistics page
- Cluster closely grouped markers on the map
- Replace jsonwebtoken with jose to unblock Node 26
- Upgrade server test infrastructure (jest 29, supertest 7, nodemon 3)
- Upgrade server runtime dependencies (bcrypt 6, dotenv 17, uuid 11, cross-env 10, etc.)
- Upgrade server to Express 5
- Upgrade server ESLint to v9 with flat config
- Upgrade converter dependencies (jest 29, nodemon 3, dotenv 17, etc.)
- Upgrade converter ESLint to v9 with flat config
- Migrate converter to ESM + TypeScript (chokidar 4, image-size 2)
- Add GitHub Actions CI for server, converter, and react-app
- Migrate server to ESM (vitest replaces jest, drops cross-env and nodemon)
- Swap sqlite3 for better-sqlite3 (sync API, simpler driver code)
  - **Heads-up (long-lived DBs):** better-sqlite3 enables `PRAGMA foreign_keys = ON` by default, whereas the old `sqlite3` driver left it off. If your prod DB was bootstrapped from the legacy schema, the `gallery_photo` foreign keys point at `photos(id)` / `galleries(id)` (plural) instead of the actual `photo` / `gallery` tables, and every mutation now fails with `no such table: main.galleries`. Fix by rebuilding the table on the prod DB with corrected references (back up first): `CREATE TABLE gallery_photo_new (gallery_id TEXT, photo_id TEXT, PRIMARY KEY(photo_id, gallery_id), FOREIGN KEY(photo_id) REFERENCES photo(id), FOREIGN KEY(gallery_id) REFERENCES gallery(id)); INSERT INTO gallery_photo_new SELECT * FROM gallery_photo; DROP TABLE gallery_photo; ALTER TABLE gallery_photo_new RENAME TO gallery_photo;` — wrap in `PRAGMA foreign_keys=OFF; BEGIN; … COMMIT; PRAGMA foreign_key_check; PRAGMA foreign_keys=ON;`.
- Migrate server to TypeScript (strict mode, tsx runtime)
- Replace CRA with Vite + Vitest for the react-app; swap react-helmet for react-helmet-async, axios for native fetch, drop date-diff
  - **Breaking (deployment):** frontend env vars in `react-app/.env` (and any per-environment `.env`) renamed from `REACT_APP_*` to `VITE_*`. Update each deployed environment's config: `REACT_APP_PHOTO_ROOT_URL` → `VITE_PHOTO_ROOT_URL`, `REACT_APP_THEME` → `VITE_THEME`, `REACT_APP_DEFAULT_LANGUAGE` → `VITE_DEFAULT_LANGUAGE`, `REACT_APP_DEFAULT_GALLERY` → `VITE_DEFAULT_GALLERY`, `REACT_APP_INITIAL_GALLERY_VIEW` → `VITE_INITIAL_GALLERY_VIEW`, `REACT_APP_FIRST_WEEKDAY` → `VITE_FIRST_WEEKDAY`. Old names are silently ignored at build time.
- Refresh server and converter dependencies to latest majors: vitest 4, uuid 14, jose 6, yargs 18, TypeScript 6, ESLint 10, chokidar 5, `@types/*` packages
- Type the SQLite row shapes per table in the server's db layer; drop the `Record<string, any>` escape hatches. Fixed two latent bugs in `bin/add-gallery.ts` (snake_case keys instead of camelCase, untyped argv accesses) surfaced by the new strict types.
- Quieten dotenv 17 "tip" output in tests via the `DOTENV_CONFIG_QUIET=true` env var on the test scripts; keep production using the side-effect `import "dotenv/config"` so `.env` is loaded during import resolution (before downstream modules read `process.env`)
- Tighten server `tsconfig.json`: drop `allowJs`/`checkJs` now that no `.js` source remains
- Replace `gm` with `sharp` in the converter; image processing is ~20× faster on real-size photos
  - **Breaking (deployment):** the converter no longer requires the ImageMagick (or GraphicsMagick) CLI on the host — sharp ships its own libvips bindings via npm. You can `apt-get remove imagemagick` (or equivalent) on the converter host. CI's converter job no longer installs imagemagick.
- Warm-up dep refresh in the react-app before the React majors: jose 4→6 (matches the server), mathjs 10→15, react-icons 4→5, geo-coord 0.1→0.2 (matches the converter), jsdom 25→27, globals 16→17, vitest 2→3. Drop the unused `@testing-library/user-event` dev dep. ESLint 10 deliberately skipped here — `eslint-plugin-react@7.37.5` still caps its peer at `eslint@^9.7`, so the react-app stays on ESLint 9 until the plugin ships 10-compat.
- Upgrade the react-app to React 18 with its coupled deps: react/react-dom/react-is 17→18.3.1, react-helmet-async 1→2, react-leaflet 3→4 with @react-leaflet/core 1→2 (leaflet pinned to ^1.9.4), react-leaflet-markercluster 3.0.0-rc1→4.2.1 (now requires the explicit `leaflet.markercluster` peer), react-chartjs-2 3→4 with chart.js still on 3.x, react-i18next 11→14 with i18next 21→23, react-swipeable 6→7, @testing-library/react 12→14. `src/index.js` switches from `ReactDOM.render` to `createRoot(...).render`; the marker-cluster CSS import path changes from `react-leaflet-markercluster/dist/styles.min.css` to `react-leaflet-markercluster/styles` (4.x renamed the export entry). Side fixes surfaced by React 18's strict PropTypes validator: register chart.js components via `import "chart.js/auto"` (react-chartjs-2 4.x stopped auto-registering, so `/stats` was rendering empty charts); correct `<MapContainer>` JSX prop types at every call site (string literals like `height="800"`, `drawLine="true"` had silently been the wrong type — also drop the dead `zoom="9"` prop, the component only reads `maxZoom`); fix `Swipeable`'s `children: PropTypes.object` → `PropTypes.node` (it always receives an array). `prop-types` is now pinned as a direct dep so the upcoming router and React majors can't lose it via a disappearing transitive.
- Upgrade `react-router-dom` 5→7 (skip the intermediate v6 — v7 is essentially v6 with a few re-exports, and the meaningful migration is the v5→v6 API rewrite). `Switch` → `Routes`, `<Route path="X"><Comp/></Route>` → `<Route path="X" element={<Comp/>}/>`, `<Redirect to="X"/>` → `<Navigate to="X" replace/>` (the explicit `replace` preserves v5 Redirect's history-replace semantics — without it Navigate pushes a new entry and breaks Back). `useParams`, `useLocation`, and `Link` are unchanged; the optional path-segment syntax `/:year?/:month?/:day?` works natively in v6.5+/v7 so the routes don't have to be split.
- Upgrade the react-app to React 19 with its coupled deps: react/react-dom/react-is 18.3.1→19.2.1, react-helmet-async 2→3, react-leaflet 4→5 with @react-leaflet/core 2→3, react-leaflet-markercluster 4.2.1→5.0.0-rc.0 (only React 19-compatible release), react-chartjs-2 4→5 with chart.js 3→4 as a required cohort, react-i18next 14→17 with i18next 23→26, @testing-library/react 14→16. No source changes needed — React 19's removals (legacy context API, string refs, `propTypes`/`defaultProps` for function components, `PropTypes` namespace on the React export itself) don't intersect this codebase, and helmet/leaflet/i18next API surfaces are stable across these majors.
- Swap `styled-components` for `@emotion/styled` (37 files). styled-components is in maintenance mode and has known friction with React 19; emotion is actively maintained and the API is near-identical, so the migration is a mechanical import swap for 36 files. The one `createGlobalStyle` site (in `Gallery/index.js`) converts to emotion's `Global` component (from `@emotion/react`) with a small `globalStyles(theme)` helper. `MapContainer`'s `Root` styled component switches `height` → transient `$height` with an explicit `shouldForwardProp`, because `height` is a valid HTML attribute (on `img`, `canvas`, etc.) and emotion's default prop-valid filter would otherwise forward it to the underlying div and trigger a React unknown-DOM-attribute warning. Done before the upcoming JS→TS migration so the styled-component types are right from the start.

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

[Unreleased]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.5.1...HEAD
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
