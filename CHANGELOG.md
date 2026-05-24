# Changelog

## [Unreleased]

### Frontend

- Stats page no longer freezes the UI during the chart.js redraw triggered by a language switch (or filter / theme change). A translucent "Updating…" overlay paints over the chart area while the rebuild runs; the top menu / nav / Title stay responsive. Doesn't make the rebuild itself faster — that's the structural #286 work in 0.13 — but the freeze without feedback is gone.

- Merge the standalone Day view into Month — navigating to `/g/<gallery>/<year>/<month>/<day>` now renders the whole Month with that day's `DayTitle` highlighted and scrolled into view, rather than a dedicated per-day page. Shared/bookmarked day URLs still work; the calendar hierarchy collapses from Year → Month → Day → Photo to Year → Month → Photo, matching how Photo's up-nav already skipped the Day view.
- Ship seven new built-in themes (`dark`, `amoled`, `forest`, `silver`, `showcase`, `teal`, `paper`) and repurpose `bw` from a monochrome-filter theme into a true high-contrast light theme. Highlights: `dark`/`amoled` fill the long-standing dark-mode gap, `showcase` is a museum-wall dark backdrop with muted chrome so the photos pop, `paper` is the warm-cream printed-album feel without the desaturation the previous `sepia` variant carried. Photo frame (matte + border) and the gallery/stats `<select>` text are now theme-aware. Themes are picked via `DEFAULT_THEME` in `.env` or per-gallery `theme` column on the `gallery` row.
- Photo view gains controlled zoom: mouse-wheel scroll zooms the image (clamped 1×–8×), `+` / `=` / `-` keyboard shortcuts step the zoom level, `0` resets, and once zoomed past fit the image can be panned with mouse drag. Pan is clamped so the image edges can't go past the frame. Zoom resets on next/previous-photo navigation; swipe-to-next/prev is suppressed while zoomed so dragging doesn't accidentally change photos.

## [0.9.1] - 2026-05-23

### Fixed

- Logging out via the profile-icon `UserMenu` no longer leaves the previous identity's access-derived state on screen (gallery list, map visibility, per-photo coordinates). The `queryClient.invalidateQueries` calls #244 added to the original `Logout.tsx` got lost when #182 deleted that file and inlined the logout flow into `UserMenu.handleLogout`; restored.

## [0.9.0] - 2026-05-23

### Server

- Collapse "no view permission" and "gallery doesn't exist" into the same response on `GET /api/v1/galleries/:id` (`200 { id, hideMap: false }`) and `GET /api/v1/gallery-photos/:galleryId` (`200 []`). The single-photo endpoint similarly returns `404` for both cases (was `403` for no-access, `404` for no-such-photo). Without this, an unauthenticated walk of gallery IDs could enumerate which ones exist by reading the `403` / `404` distinction.
- JWTs now expire after `SESSION_LENGTH_MS` (90 days, bumped from the 7-day constant that was defined but unused). `setExpirationTime` is wired into the sign step, and the verify path distinguishes `JWTExpired` (jose) from other verification failures so the wire response is the new typed `TokenExpiredError` instead of the generic `InvalidTokenError`. (closes #207)
- `PUT /api/v1/users/self/password` lets an authenticated user change their own password without admin help. Body: `{ currentPassword, newPassword }`; verifies the current password via bcrypt, hashes the new one, rotates the user's `secret` (invalidating every other outstanding JWT for the user — same security model as `bin/user.ts passwd`), and returns a freshly-minted JWT so the caller's current session stays alive. Guests get 403; wrong current password gets 422 (body content, not a session problem — keeps the SPA's global 401 handler from kicking the user out of their valid session). New `ValidationError(422)` added to the typed error hierarchy. (part of #182)

### Frontend

- Navigating to a gallery the requester can't see (private gallery, non-existent ID, or a revoked session) no longer hangs on a persistent "Loading" spinner — the SPA renders the empty-gallery view directly without firing the photos API call. The Title bar's gallery dropdown gains an italicised placeholder option for the unavailable id (matching the URL) so the selection is honest, and renders even when only one real gallery is accessible so the user has a way to switch into it.
- Login / logout now invalidate the access-derived TanStack Query caches (`["galleries"]`, `["gallery-photos"]`) so the gallery list, map visibility, and any other per-user data refreshes immediately — previously the SPA would keep showing the prior identity's view until a manual reload. Logout's bearer-token cleanup also runs before the React re-render now (not after), so the queries fired by the user change don't send the just-revoked token. Drive-by: `localStorage.clear()` in the auth paths is narrowed to just the `user` key so the `lang` preference (and any other unrelated storage) survives auth state changes. (closes #244)
- Add a responsive toast-notification surface (`<Notifications />` mounted at the app root, backed by a `useNotificationsStore` Zustand store with per-type defaults, click-to-dismiss, and auto-dismiss timeouts). Login uses it to surface "invalid username or password" for 401s and the rate-limit message for 429s — previously failures were silently swallowed via a `TODO: notify user` comment. The toast strip spans edge-to-edge on phones and tucks into the top-right of wider viewports. (closes #248)
- Move the login form out of the top menu and into a floating modal. A global onResponse handler in the openapi-fetch client catches any 401 with an Authorization header attached and opens the modal — same UX whether the bearer expired (now possible after the JWT expiration change), the operator rotated the user's secret, or the token was otherwise invalidated mid-session. A "session expired" toast accompanies the modal so the user understands why they're being asked to log in again. The URL is preserved across the re-login so they land back where they were; if the new session has narrower access, the empty-gallery view from the previous PRs takes over. (closes #207)
- Replace the inline login/logout buttons in the top menu with a profile icon (`<UserMenu>`). Outlined `BsPerson` when not logged in (clicking opens the login modal); filled `BsPersonFill` when logged in (clicking opens a dropdown with the username, "Change password", and "Log out"). The "Change password" entry opens a new floating `<ChangePasswordModal>` mirroring the login modal's shape — three fields (current / new / confirm), inline error pill on failure, success toast on completion. The new JWT returned by the backend is swapped into local state so the user stays logged in across the rotation. (closes #182)
- Global 401 handler closes the change-password modal before opening the login modal so a session expiry mid-change-password no longer stacks two backdrops. The hand-rolled JWT-payload decode in `Login.tsx` (`JSON.parse(TextDecoder.decode(jose.base64url.decode(...)))`) is replaced with a direct `jose.decodeJwt(rawToken)` call — same effect, matches the codebase's `jose` usage everywhere else, retires the `TODO: sign/verify` comment.

## [0.8.0] - 2026-05-22

### Server

- Replace string-constant error throws with a typed `AppError` class hierarchy (`AccessError`, `NotFoundError`, `LoginError`, `InvalidTokenError`, `NotImplementedError`, `UnavailableError`) in `server/lib/errors.ts`. Each subclass carries its HTTP status; the error-handler middleware reads `.status` and echoes `.message` as the JSON response. The legacy `CONST.ERROR_*` string constants and the dual-path switch in error-handler.ts are now retired (no remaining throw sites referenced them). Wire-shape unchanged for every existing endpoint. (closes #219)
- Migrate the server from Express to Fastify (host framework swap). Routes are native Fastify plugins; auth/error/404 are Fastify hooks; helmet, compression, and static-file serving move to `@fastify/*` plugins; morgan is replaced by pino with pino-pretty in dev. Wire shape is unchanged — same URLs, same response bodies, same status codes — but per-request log lines are now structured (still carrying `userId` / `ip` / `responseTime`). (part of #167)
- Adopt TypeBox as the schema-and-types source for each route — every `:param` is now validated against a JSON Schema at the framework boundary, and route handlers infer their `request.params` / `request.body` types from the same definition. The login POST gains a body schema (`{ id?, password? }`); malformed structural bodies now reject with 400 before the handler runs (previously a non-object body fell through to 401 LoginError). (part of #167)
- Generate the OpenAPI document from the route schemas via `@fastify/swagger` and expose it through Swagger UI at `/api/v1/docs` (always on in dev; gated by `ENABLE_DOCS=true` in any other environment). The spec is also dumped to a committed `server/openapi.json` via the new `npm run docs:dump` so the react-app's generated client (PR D of #167) can codegen against a stable artifact. (part of #167)
- Drop the trailing slash from `GET /api/v1/gallery-photos/:galleryId/`. Inherited from the original Express controller; `ignoreTrailingSlash` keeps both forms working, but the OpenAPI spec is cleaner without it. (part of #167)
- Declare response schemas on the routes the SPA consumes, annotate the rest with `security: [{ bearer: [] }]` so Swagger UI surfaces which routes need auth, and add a `RateLimitError` (HTTP 429) to the typed-error hierarchy. Also fixes a latent bug where the central `errorHandler` wasn't actually being called — `setErrorHandler` was registered *after* the controller plugins, so child scopes inherited Fastify's default `{statusCode, error, message}` body instead of the project's `{ error }` shape. Restored by moving the registration before the plugin registrations; AppError responses now match what the source code claims they do. (part of #167)
- Upgrade typebox: `@sinclair/typebox@0.34` → `typebox@1.x` (the renamed successor package) and `@fastify/type-provider-typebox@5.2` → `^6.1`. Same API surface, so route-schema definitions are unchanged; only the import specifier (`from "typebox"` instead of `from "@sinclair/typebox"`) differs. Generated OpenAPI emits properties in a slightly different field order — `additionalProperties` now follows `properties` instead of preceding it — semantically identical. Drive-by fix: `errorHandler` now honors Fastify-built errors' own `statusCode` (validation, parse, framework 4xx) instead of overriding everything to 500 — a regression introduced when the handler registration was moved earlier in the previous server PR. (closes #238)

### Frontend

- Replace the hand-rolled `fetch` wrapper and per-resource service wrappers with a typed `openapi-fetch` client. The TypeScript types are generated by `openapi-typescript` from the committed `server/openapi.json` via `npm run api:codegen`, and a CI step verifies the committed `react-app/src/lib/api-schema.ts` matches the spec so the client can't silently drift from the server contract. (closes #167)
- Adopt TanStack Query for server-state management in `Gallery/index.tsx`. The four `useEffect` + `useState` pairs that fetched meta / galleries / photos / unique-values are replaced by three `useQuery` hooks plus two `useMemo`s for derived state; the stale-gallery reset that called `setX(undefined)` inline during render is gone (TanStack Query keys handle it). Main bundle 436 → 470 kB raw / 138 → 148 kB gzipped (~10 kB gz for the query runtime). (part of #181)
- Adopt Zustand for cross-cutting client state — four small stores (`user`, `lang`, `filters`, `scroll`) replace the prop-drilled state in `App.tsx` and `Gallery/index.tsx`. The i18n bridging (loading per-language country dictionaries, persisting `lang` to localStorage) now lives inside the lang store; the user-rehydration logic lives in the user store; the scroll-position memo lives in the scroll store. `App.tsx` shrinks to routing + bootstrap. (closes #181)
- Code-split the `Stats` and `Photo` subtrees out of the main bundle via `React.lazy`. Stats pulls in the aggregate-charts logic; Photo pulls in `react-leaflet` for the per-photo map. Calendar-only browsing no longer downloads either. Main-bundle size 859 kB → 642 kB raw (276 kB → 204 kB gzipped, a 26% reduction). Suspense fallback lives at the Gallery component's root. (closes #162)
- Bundle audit + `MapContainer` extracted into its own lazy chunk via a `MapContainer.lazy.tsx` wrapper, so leaflet + react-leaflet + markercluster (~60 kB gzipped) are no longer in the main bundle (were previously eagerly imported by Year/Month/Day calendar footers). Each consumer has a Suspense with a fixed-height placeholder so the page doesn't reflow when the map chunk arrives. Main bundle now 444 kB raw / 143 kB gzipped — under vite's 500 kB warning threshold. `react-app/README.md` gains a "Bundle shape" section documenting the chunk layout and the CSS approach (Emotion + a small global `App.css`). `ANALYZE=1 npm run build` writes a `rollup-plugin-visualizer` treemap to `build/bundle-stats.html` for future audits. (closes #221)
- i18n architecture pass: rename `_plural` keys to the `_one` / `_other` CLDR suffixes that i18next v4 actually resolves (English was rendering `"2 year"` / `"3 photo"` because the plural variants were unreachable), add `fallbackLng: "en"`, and dynamic-import the per-language `i18n-iso-countries` dictionaries so each ships as its own ~2 kB gz chunk (main 444 → 429 kB raw, 143 → 136 kB gzipped). Also fixes a latent `i18n.on("languageChanged", …)` listener leak in `App.tsx`. (closes #220)

## [0.7.4] - 2026-05-22

### Fixed

- OpenStreetMap tile fetches were blocked with 403 (`osm.wiki/Blocked`) after 0.7.2 added helmet — its default `Referrer-Policy: no-referrer` stripped the `Referer` header on every outbound request, which OSM's volunteer-run tile servers reject as bot traffic. Overridden to `strict-origin-when-cross-origin` (modern browser default) so the browser sends just the origin on cross-origin requests, satisfying OSM without leaking the full URL.

## [0.7.3] - 2026-05-22

### Fixed

- Login rate-limit now skips successful requests — only failed login attempts count toward the per-IP limit, so a typo'ing operator who then gets it right isn't throttled (only sustained guessing is). The per-IP keying still needs nginx to forward `X-Forwarded-For` for it to actually distinguish clients (already in the README's recommended nginx block).

### Server

- Request logger now prepends a local-time timestamp (`[YYYY-MM-DD HH:MM:SS.mmm]`, matching lib/logger.ts so request lines interleave cleanly with the rest of the log) and includes the client IP (`:remote-addr`, resolved through `req.ip` so trust-proxy unwrapping applies) — also makes it visible which address the per-IP rate-limiter is keying off; an operator seeing `127.0.0.1` on every line knows the nginx vhost is missing `proxy_set_header X-Forwarded-For …`.

## [0.7.2] - 2026-05-22

### Fixed

- Apply the `hide_map` cascade on `GET /api/v1/galleries/:id` and `/api/v1/photos` (`/`, `/:id`); previously only `/gallery-photos/...` masked the embedded photos' coordinates, so `hide_map=1` leaked coords through the other two routes. (closes #201)
- Stop logging credentials, JWT secrets, and tokens in debug-level statements (`tokens-v1.ts`, `models/token.ts`); only the user ID is logged now. Prevents plaintext password leaks into pm2 logs whenever `DEBUG=true` is flipped to triage a login issue. (closes #202)

### Server

- Add `helmet` for baseline security headers (HSTS, X-Content-Type-Options: nosniff, Referrer-Policy: no-referrer, X-Frame-Options, Permissions-Policy, etc.); CSP intentionally left off pending a bundle audit. (closes #204)
- Rate-limit `POST /api/v1/tokens` (login) to 10 attempts per IP per 15 minutes via `express-rate-limit`; trust-proxy set to 1 so the limit keys off the real client IP behind nginx. (closes #203)
- Drop the open `cors()` middleware — none of the documented deploy patterns need cross-origin API access, and bearer-token auth already neutralised most CSRF concerns. If a future setup needs it, add a `CORS_ORIGINS` env knob then. (closes #205)
- Tighten the token-secret reload interval from 60s to 5s, so a `bin/user.ts passwd` rotation (which kills sessions) takes effect quickly. (closes #206)

### Operator scripts

- `bin/user.ts passwd <id> [password]` now prompts for the password with no echo when the positional is omitted — avoids leaking the password into shell history and `ps`. Positional path stays for scripting. (closes #200)
- `bin/instance.ts` infers the instance from cwd when invoked inside an existing instance dir (recognised by the `.env` + `code`-symlink pair), reading the logical name from `.env`'s `INSTANCE_NAME` (the pm2 process label) and falling back to the dir's basename when missing — so the pm2 commands in the upgrade output reflect what pm2 actually labels the process. Migrated the script's argv parsing to yargs (matching the other operator scripts) for consistent `--help`, validation, and unknown-flag rejection. (closes #198)
- Upgrade flow now recommends `pm2 delete && start-prod.sh` instead of `pm2 restart` — restart preserves cached script paths and package.json version, so the previous instruction silently kept the old code running after a symlink flip. README and `bin/instance.ts` Next-steps output both updated. (closes #199)

## [0.7.1] - 2026-05-21

### Fixed

- Restore the per-workspace `version` field that 0.7.0 had removed (pm2 reads version from the script's own package.json, not the monorepo root, so `pm2 list` showed no version after the 0.7.0 upgrade); root stays canonical, with a new `npm run version:sync` script propagating it to the workspaces.

## [0.7.0] - 2026-05-21

### Features

- Privacy toggle for the map and photo coordinates. Set via the `user_gallery` table's new `hide_map` column — the four-cell cascade picks the most specific row with a non-null value: `(user, gallery)` > `(user, ':all')` > `(':guest', gallery)` > `(':guest', ':all')`. Both layers fire: the server strips `coord_lat`/`coord_lon`/`coord_alt` from the photo payload when hidden (so there's no data to leak), and the gallery payload gains a `hideMap` boolean that the frontend uses to skip rendering the map widget. Schema migration 003 adds the column; existing deploys pick it up automatically on next server start. To hide for unauthenticated visitors only: `UPDATE user_gallery SET hide_map = 1 WHERE user_id = ':guest' AND gallery_id = ':all'`. (closes #159)

### Cross-package

- Rename and relocate the operator scripts. They lose the misleading `add-` prefix (they were upserts, never just creates) and gain a more accurate bare-noun naming: `add-photo.ts` → `photo.ts`, `add-gallery.ts` → `gallery.ts`, `add-user.ts` → `user.ts`, `init-instance.ts` → `instance.ts`. `instance.ts` (no project deps — pure Node) moves to `bin/instance.ts` at the repo root, where it's invoked directly with the absolute path of the version you want for bootstrap / upgrade (`/opt/photo-diary/<version>/bin/instance.ts <name>`). The other three (`photo`, `gallery`, `user`) stay in `server/bin/` since they import the server's DB / logger / etc. The `instance` script populates a per-instance `<instance>/bin/{photo,gallery,user}.ts` directory of symlinks on init / doctor / upgrade, each pointing at `<instance>/code/server/bin/<name>.ts`, so the day-to-day commands inside an instance dir become `./bin/photo.ts …` instead of `./code/server/bin/add-photo.ts …`. The `.ts` extension is kept on the symlinks so editors recognise them as TS source via realpath; a small root-level `tsconfig.json` (extends `server/tsconfig.json`) covers `bin/instance.ts` itself, and the root `package.json` gains `"type": "module"` so NodeNext treats it as ESM. Docs updated throughout.
- Switch to npm workspaces. New top-level `package.json` lists `server`, `converter`, and `react-app` as workspaces and exposes `npm run setup` (install + build) and `npm run build` (build react-app and copy into `server/build/`) at the repo root. Replaces the previous per-package install ritual and the `server/build:ui` script. Single root `package-lock.json` replaces the three per-package lockfiles. CI workflow updated to install once at the root and run lint/typecheck/test per workspace.
- Add `server/bin/init-instance.ts` for bootstrapping and upgrading multi-instance deploys: creates the directory tree, generates `.env` with a fresh random `SECRET`, creates a `code` symlink in the instance dir pointing at the running version's code root. Re-runs are idempotent — same code root acts as a doctor and reports missing `.env` keys (`--fix` appends defaults), different code root acts as an upgrade and backs up the DB to `db.sqlite3.pre-<new-version>` before flipping the symlink. Same script handles every lifecycle event for an instance.
- **Breaking (deployment):** drop the `PHOTO_ROOT_DIR` and `DB_OPTS` env vars. The photo repository now lives at the fixed path `<instance-dir>/photos/` and the SQLite DB at `<instance-dir>/db.sqlite3` — both relative to the server's / converter's working directory (the instance directory when launched via `start-prod.sh`). Existing deploys: rename `<instance>.sqlite3` → `db.sqlite3` in each instance dir; symlink `<instance>/photos` (or the whole instance dir) if the photos live elsewhere, e.g. `ln -s /mnt/data/dailybw /var/photo-diary/dailybw/photos`. Remove the two now-inert lines from each instance's `.env`.
- Add `server/bin/start-prod.sh` and `converter/bin/start-prod.sh` wrappers: each sources `.env` from the current working directory and derives the pm2 process name from `INSTANCE_NAME` (`<name>` and `<name>-converter`). Symlink-resilient — invoke via the instance dir's `code/server/bin/start-prod.sh` and they still locate their own code root correctly. The `prod` npm script in both packages now invokes the wrapper. Single-instance use stays the same — without an `INSTANCE_NAME`, the pm2 names fall back to `photo-diary-server` / `photo-diary-converter`. `start-dev.sh` siblings give the same instance-dir layout for foreground `tsx watch` dev runs.
- Document the multi-instance deploy pattern in the top-level README: versioned code under `/opt/photo-diary/<version>/`, host prep via `tar --strip-components=1` from the GitHub source tarball, per-instance directories under `/var/photo-diary/<name>/` with their own `.env`, `code` symlink, photos, and SQLite DB, nginx vhost per instance, atomic upgrade via the `init-instance` script.
- Expand the README's nginx section with a TLS vhost (certbot, proxy headers, immutable cache on photo locations, `client_max_body_size` for admin uploads) and a worked example of per-gallery vhost mapping via the `gallery.hostname` regex. (closes #179)
- Fix `bin/gallery.ts` so `--hostname` actually persists — the flag was declared but silently dropped on create/update before this.

### Server

- Replace the `uuid` dep with the built-in `crypto.randomUUID()`
- Send `X-Robots-Tag: noindex, noai, noimageai` on every response, including served photo files
- Add a DB migration runner that uses `meta.schema_version` as the cursor; runs at server startup against the better-sqlite3 driver. Bootstraps fresh DBs from `db/sqlite3/migrations/001_baseline.sql`, then advances to v2 via `002_fix_gallery_photo_fk.sql` which rebuilds `gallery_photo` with the correct singular FK references (the long-standing `photos`/`galleries` typo). Drops the obsolete `schema/sqlite3.ddl`, `schema/migrate/sqlite3_from_0.ddl`, and `migrate_legacy_to_sqlite3.sh`.
- Resolve the bundled-frontend static directory from `import.meta.dirname` (with `STATIC_DIR` override) so the server can be started from any working directory — needed for the multi-instance deploy where the code lives at a shared path and each instance has its own CWD.
- Rename the `acl` table to `user_gallery` and its `level` column to `access_level` (migration 004) — the original names became misleading once the table grew non-access columns like `hide_map`. (closes #185)
- Add `server/bin/access.ts` (`list` / `level` / `unset` / `hide-map` subcommands) for managing `user_gallery` rows without direct SQL; also fixes `loadUserAccessControl` to filter out `access_level=NULL` rows so privacy-only rows don't break access fall-through to `:all`. (closes #186)
- Switch both the access and `hide_map` cascades to user-first ordering — a user's row at any gallery level (specific, `:public`, or `:all`) beats every `:guest` row, then `:guest` is walked in the same order; authorizer now uses a new `db.resolveAccessLevel` SQL helper mirroring `resolveHideMap`. (closes #189)
- Restructure `bin/user.ts` as `list` / `passwd <id> <password> [--keep-secret]` / `delete <id> [--yes]` subcommands (matching `access.ts`); `list` is now a table with an admin flag, and `delete` cascades the user's `user_gallery` rows. (closes #161)
- `bin/gallery.ts` now takes the gallery ID as a required positional (`gallery.ts <id> [options]`) instead of `--id <id>`, so the required arg shows in the usage line.

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

[Unreleased]: https://github.com/vlumi/photo-diary/compare/v0.7.4...HEAD
[0.7.4]: https://github.com/vlumi/photo-diary/compare/v0.7.3...v0.7.4
[0.7.3]: https://github.com/vlumi/photo-diary/compare/v0.7.2...v0.7.3
[0.7.2]: https://github.com/vlumi/photo-diary/compare/v0.7.1...v0.7.2
[0.7.1]: https://github.com/vlumi/photo-diary/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/vlumi/photo-diary/compare/v0.6.0...v0.7.0
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
