# Photo Diary Server

This server implements the RESTful API of the Photo Diary

## Requirements

- [Node.js](https://nodejs.org) 22 or newer; npm 10+ recommended
- Dependencies (see `package.json` for the full list)
  - [Fastify](https://fastify.dev/) 5 with `@fastify/type-provider-typebox` — routes are TypeBox-validated and the OpenAPI dump comes from the same schemas
  - [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) for the default SQLite driver
  - [jose](https://github.com/panva/jose) for JWT signing/verification
  - [tsx](https://github.com/privatenumber/tsx) as the TypeScript runtime (no separate build step)

## Running Instructions

The server is TypeScript and runs via tsx (no build step). Common scripts:

```sh
npm run dev        # tsx watch index.ts (NODE_ENV=dev)
npm start          # tsx index.ts       (NODE_ENV=dev)
npm run prod       # pm2 start --interpreter tsx index.ts (NODE_ENV=prod)
npm test           # vitest run
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
```

To produce the bundled frontend (`server/build/`) for production, run `npm run build` from the **repo root** — it builds the react-app workspace and copies the output into `server/build/`. Or `npm run setup` from the repo root to install all workspaces *and* build in one step.

### Environment Variables

Read at startup from a `.env` file in the **current working directory** (which is the instance directory in a multi-instance deploy, or the server directory in a single-package dev run), via [dotenv](https://www.npmjs.com/package/dotenv). Inline `KEY=value npm run …` overrides also work.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `SECRET` | ✓ | — | HMAC secret used to sign JWT tokens. The server refuses to start without it. Keep stable per instance; rotating invalidates every existing session. Also signs the one-shot cross-host SSO tokens (#664); multi-instance deploys that want the UserMenu switcher need the **same value** in every sibling instance's `.env`. Access JWTs stay safe across that sharing because they're signed with `${user.secret}${SECRET}` (per-user composite), so a leaked SSO token can't be turned into an access JWT. |
| `DB_DRIVER` | ✓ | — | `sqlite3` (production) or `dummy` (test fixture). |
| `PORT` | | `4200` | HTTP port nginx proxies to. One per instance. |
| `INSTANCE_NAME` | | `photo-diary-server` | pm2 process name when launched via `bin/start-prod.sh`. The converter half is automatically suffixed `-converter`. |
| `NODE_ENV` | | `prod` | `dev` / `prod` / `test`. Set by the npm scripts; don't override unless you know why. |
| `DEBUG` | | `false` | When truthy, enables verbose logger output. |
| `STATIC_DIR` | | `<source>/build` | Path to the bundled frontend. Resolved relative to the server's source file by default; override if you build into a non-standard location. |
| `REVERSE_GEOCODE` | | `false` | When set (any truthy value), the converter reverse-geocodes new photos with coords at intake. Opt-in by default — coordinates are sent to Nominatim. `photo-geocode.ts` honours this flag by default; pass `--force` to bypass for one-off backfills. |
| `REVERSE_GEOCODE_EXTRA_LANGS` | | — | Comma-separated extra languages to fetch on top of English (e.g. `ja,fi`). Each adds one 1 RPS Nominatim call per photo at intake. `photo-geocode.ts` uses the same default. |
| `NOMINATIM_BASE_URL` | | `https://nominatim.openstreetmap.org` | Override to point at a self-hosted Nominatim. |
| `GEOCODE_DIR` | | `<cwd>/.geocode` | Where the geocode lock file and per-`(lang, coord)` cache live. The cache key is `<lang>/<lat:.4f>:<lon:.4f>.json` (~11 m precision). |

The SQLite DB file and the photo repository are **not** configured via env vars — they're fixed-by-convention at `<cwd>/db.sqlite3` and `<cwd>/photos/` respectively. See the next subsection.

### Boot-time vs. runtime config

Two places hold instance config:

- **`.env`** (boot-time). Read once when the server / converter process starts. Changing requires a restart. Lives here: credentials and binding (`SECRET`, `PORT`, `DB_DRIVER`, `INSTANCE_NAME`), paths (`STATIC_DIR`, `GEOCODE_DIR`), and converter daemon knobs (`REVERSE_GEOCODE`, `REVERSE_GEOCODE_EXTRA_LANGS`, `NOMINATIM_BASE_URL`, `DEBUG`).
- **`meta` table** (runtime). Read per-request when the SPA fetches `/api/v1/meta`. Changing takes effect on the next response — no restart. Edited from `/m/instance` (admin UI) or `bin/meta.ts`. Holds the instance identity (`name`, `description`, `cdn`, `image`), the SPA's runtime defaults (`defaultGallery`, `defaultTheme`, `defaultLanguage`, `initialGalleryView`, `firstWeekday`, `betaFeatures`), and the converter's rendition ladder (`renditions`).

### Fixed-by-convention paths

The SQLite DB file and the photo repository are no longer configurable via env vars — they live at fixed locations relative to the server's working directory (which is the **instance directory** when launched via `start-prod.sh`):

- **`<cwd>/db.sqlite3`** – the SQLite DB. If absent at first start, better-sqlite3 creates the file and the migration runner bootstraps the schema from `db/sqlite3/migrations/001_baseline.sql`. Subsequent starts apply any pending migrations from the same directory in version order, using the `meta.schema_version` row as the cursor. New migrations: drop `NNN_<description>.sql` (with a higher number than the last one) and end the file with `UPDATE meta SET value='NNN' WHERE key='schema_version';`.
- **`<cwd>/photos/`** – the photo repository. Must contain the sub-directories `inbox`, `original`, `thumbnail`; rendition directories `display/<maxDim>/` are created by the converter on first intake (per the `renditions` meta key, a JSON-encoded list of integer maxDims; default `[1500]`). The fixed-layout dirs are seeded by `<repo-root>/bin/instance.ts`.

If you need the DB or photo dir on a separate disk, symlink the file (`db.sqlite3`), the subdirectory (`photos/`), or the whole instance dir.

### Examples

- With the variables in `.env`:
  - `npm run dev`
  - `npm run prod`
- With the variables inlined:
  - `SECRET=test DB_DRIVER=dummy npm run dev`
  - `SECRET=… DB_DRIVER=sqlite3 npm start` (creates `./db.sqlite3` in CWD)
  - `SECRET=… DB_DRIVER=sqlite3 npm run prod`

### Management scripts

`instance.ts` lives at `<repo-root>/bin/instance.ts` (it has no project deps — pure Node, so it can sit outside the workspace and be invoked directly when bootstrapping a new instance). The rest — `photo.ts`, `gallery.ts`, `user.ts` — live in `server/bin/` because they import the server's DB/logger/etc. All four are executable (`#!/usr/bin/env -S npx tsx`) and read `.env` from the **current working directory**, so run them from the instance directory:

```sh
cd /var/photo-diary/dailybw
./bin/<name>.ts [options]   # via the per-instance bin/ symlinks created by instance.ts
```

The per-instance `bin/` directory (`<instance>/bin/{photo,photo-rename,photo-geocode,gallery,user,group,meta}.ts`) is populated by `bin/instance.ts` on init and refreshed on doctor / upgrade runs — each is a symlink into `<instance>/code/server/bin/`. `instance.ts` itself is deliberately not shortcut-symlinked here: bootstrap / upgrade always wants the specific code version (`/opt/photo-diary/<version>/bin/instance.ts <name>`), and the doctor re-run is rare enough that `./code/bin/instance.ts <name> --base <parent>` is fine. The `.ts` extension is kept on the symlinks (rather than bare names) so editors recognise them as TS source and apply the server's tsconfig via realpath.

#### `instance.ts <name> [--base <dir>] [--fix] [--edit]`

Bootstrap, doctor, or upgrade a Photo Diary instance directory in one command. Default base is `/var/photo-diary`. Mode is auto-detected from existing state:

- **New** — creates the directory tree, generates `.env` with a fresh random `SECRET`, creates a `code` symlink pointing at this script's own code root, and creates the per-instance `bin/{photo,photo-rename,photo-geocode,gallery,user,group,meta}.ts` shortcuts. On a TTY (and unless `--auto` is passed) prompts to create the first admin user via `./bin/user.ts passwd <username>` + `./bin/user.ts make-admin <username>` so the SPA's manage surface is reachable without walking through the printed instructions.
- **Doctor** — instance exists, `code` already points at this script's root. Reports missing `.env` keys with `✓`/`✗` markers. Refreshes any missing `bin/` shortcuts. Add `--fix` to append defaults to `.env`. Add `--edit` to walk every configurable `.env` key, show the current value, and prompt for a new one (Enter keeps it) — config-review / tweak pass without re-reading `.env` by hand. `SECRET` is read-only in this mode; rotate it manually only when you intentionally want to invalidate every session.
- **Upgrade** — `code` points at a different version. Backs up the DB to `db.sqlite3.pre-<new-version>` and flips the symlink. Refreshes `bin/` shortcuts.

#### `user.ts <subcommand> …`

Manages the `user` row, the global-admin flag, and the per-user grants in `user_gallery`. `:guest` (the sentinel user representing anonymous visitors) is accepted directly as a positional argument.

| Subcommand | Purpose |
| --- | --- |
| `list` | Print every user as a table with their `name` and global-admin flag (`user.is_admin`). |
| `make-admin <id>` | Set `user.is_admin = 1` — global admin bypasses every per-gallery check. |
| `revoke-admin <id>` | Set `user.is_admin = 0`. Per-gallery grants on `user_gallery` are untouched. |
| `set-name <id> <name>` | Set the mutable display `name` on a user. |
| `passwd <id> [password]` | Upsert: creates the user if missing, updates the password if present. Default rotates the user's `secret` (kills active JWT sessions, correct for "password lost / leaked"); `--keep-secret` opts out and keeps sessions alive. |
| `grant <user> <gallery> [--editor]` | Upsert a `user_gallery` row. Default grants view; `--editor` flips `is_editor = 1` (gallery-editor tier). Re-running with a different `--editor` toggles it. |
| `revoke <user> <gallery> [--yes]` | Delete the `user_gallery` row entirely. Asks for confirmation unless `--yes` is given. |
| `hide-map <user> <gallery> <hide\|show\|default>` | Set or clear the privacy override on the row. `default` clears the override so the cascade falls through. |
| `grants [user]` | Print direct `user_gallery` rows (optionally filtered to one user) plus a listing of users with the global-admin flag. |
| `access [user]` | Print effective access for a user (direct grants + inherited via groups + `:guest` fallback), with the sources for each row. |
| `audit` | Find users with no access, warn if the instance has no admin, or report `user_gallery` rows whose user is gone. |
| `delete <id> [--yes]` | Delete the user and cascade their `user_gallery` rows. Asks for confirmation unless `--yes` is given. |

Examples:

```sh
./bin/user.ts make-admin alice                    # alice becomes global admin
./bin/user.ts grant :guest dailybw                # public visitors can view the dailybw gallery
./bin/user.ts grant bob travel --editor           # bob can edit photos in the travel gallery
./bin/user.ts hide-map :guest dailybw hide        # hide map for guests on one gallery
./bin/user.ts access alice                        # what alice can actually see / edit, and why
./bin/user.ts revoke bob secret                   # drop bob's grant on the "secret" gallery
```

#### `group.ts <subcommand> …`

Manages user groups and their `group_gallery` grants. Groups are a way to collectively grant view / editor on a set of galleries to a set of users — a user inherits the union of every group they belong to (plus their own direct `user_gallery` grants, plus `:guest`'s grants as the floor).

| Subcommand | Purpose |
| --- | --- |
| `list` | Every group with its member count and gallery-grant count. |
| `show <id>` | Members + per-gallery grants for one group. |
| `create <id> [--name <s>] [--description <s>]` | Create a group. |
| `update <id> [--name <s>] [--description <s>]` | Update the metadata on a group. |
| `delete <id> [--yes]` | Delete the group and cascade `user_group` + `group_gallery`. |
| `members <id>` | List the members of a group. |
| `add <user> <group>` | Add a user to a group. |
| `remove <user> <group>` | Remove a user from a group. |
| `grant <group> <gallery> [--editor]` | Upsert a `group_gallery` row. Same view / `--editor` toggle as `user.ts grant`. |
| `revoke <group> <gallery> [--yes]` | Delete the `group_gallery` row. |
| `hide-map <group> <gallery> <state>` | Set or clear the privacy override on the row. |
| `audit` | Empty groups, groups with no grants, dangling FK rows. |

The cascade resolution lives in [server/lib/privacy.ts](lib/privacy.ts) and [server/lib/authorizer.ts](lib/authorizer.ts). `user.ts access <user>` is the operator-friendly way to inspect the resolved access map for any user — it shows which row (direct, group-derived, or `:guest`-derived) contributed each gallery grant.

#### `gallery.ts <id> [options]`

Creates or updates a single gallery row. The ID is positional and required; everything else is an optional override that re-invoking partially updates.

| Argument | Purpose |
| --- | --- |
| `<id>` | Gallery ID (positional, required; used in URLs and ACL references). |
| `--title <s>` | Display title. |
| `--description <s>` | Long description shown on the gallery list page. |
| `--epoch <YYYY-MM-DD>` | Anchor date for the gallery (e.g. a birthday for a "day in the life" project). |
| `--epoch_type <type>` | One of the supported epoch types — see [models/GalleryModel.ts](../react-app/src/models/GalleryModel.ts). |
| `--theme <name>` | One of `blue`, `red`, `grayscale`, `bw`, `alert` (see [themes.css](../react-app/src/lib/theme.ts)). |
| `--initial_view <view>` | One of `year`, `month`, `day`, `photo` — where the gallery lands when entered. |
| `--hostname <regex>` | Hostname regex (e.g. `^travel\.` ) that this gallery should be the default for. Lets a single instance serve multiple vhosts (see the nginx section in the top-level README). Also binds the **virtual-host scope** — requests reaching the server with a `Host` header matching this pattern are narrowed to this gallery (or to the set of galleries, if several match) for both reads and writes. Cross-gallery admin operations (user CRUD, gallery CRUD, instance meta) are unreachable. Off-scope reads collapse to the same empty placeholder shape that a non-existent gallery returns, so the hostname can't enumerate galleries beyond its scope. Instance meta (`GET /meta`) stays unscoped — it's SPA boot data. The SPA filters the breadcrumb dropdown to the matched set and redirects off-scope URLs. Global-admin work happens from the primary host (no `hostname` match). |

#### `photo.ts <command>`

Operator-side photo management. Intake (creating new rows from inbox files) is the converter's job; this tool reads, modifies, and deletes existing rows.

| Subcommand | Purpose |
| --- | --- |
| `show <id>` | Pretty-print the photo row as JSON. `--lang <code>` applies the per-language overlay. |
| `update <id>` | Modify operator-set fields on an existing row. Same property / override flags as before — see below. |
| `delete <id>` | Remove the photo row and its `photo_rendition` rows. Files on disk under `photos/{original,thumbnail}/` and `photos/display/<maxDim>/` are not touched. |
| `audit` | Find missing fields, orphan gallery links, duplicate `originalFilename`s, operator-vs-geocoded country drift. Counts-only by default; `--detail` or any restricting flag surfaces rows. `--format ids` is pipe-friendly. |
| `search <originalFilename>` | List rows sharing a camera filename (collision triage). |
| `cities <audit\|normalize\|clean-localized>` | Geocoded city hygiene — see `--help`. |

`update <id>` flags:

| Flag | Purpose |
| --- | --- |
| `--gallery <id>` | Replace gallery membership (repeat for multiple). Without this flag, links stay as-is. |
| `--title <s>` | Title. |
| `--description <s>` | Description. |
| `--country <cc>` | Country (ISO 3166-1 alpha-2). |
| `--place <s>` | Free-form place description. |
| `--author <s>` | Author. |
| `--camera-make`, `--camera-model`, `--lens-make`, `--lens-model` | Gear strings (useful when EXIF is missing or wrong). |
| `--focal <mm>` | Focal length. |
| `--aperture <f>` | Aperture (f-number). |

Only the flags you pass apply; the rest of the row stays as it was. Combine with `audit --format ids` to bulk-fix a category:

```sh
./bin/photo.ts audit --missing place --format ids \
  | xargs -I{} ./bin/photo.ts update {} --place "Yokohama, Kanagawa"
```

#### `photo-geocode.ts [--apply] [--langs en,ja] [--limit N] [--force] [--yes]`

Backfill daemon for reverse-geocoded location data. Walks photos whose row is missing geocoded fields for a given language and fills them in via Nominatim at the 1 RPS public-instance rate (one queue per process). Pairs with the converter's intake-time geocoding — recently shot photos already have data when the daemon runs, the daemon catches the historical archive and any newly added language.

The script defaults to a dry-run report; pass `--apply` to actually fetch and write.

| Flag | Purpose |
| --- | --- |
| `--apply` | Actually fetch from Nominatim and write rows. Default is dry-run report only. |
| `--langs <list>` | Comma-separated language override. Defaults to `en` + `REVERSE_GEOCODE_EXTRA_LANGS` from `.env`. English is always included. |
| `--limit <n>` | Cap per language (default: no cap). Useful to chunk a large backfill. |
| `--force` | Run even when `REVERSE_GEOCODE` isn't set in `.env`. Useful for one-off backfills on an instance that keeps intake-time geocoding off. |
| `--yes` | Skip the confirmation prompt (only meaningful with `--apply`). |

Order is recent-first by capture timestamp: visible photos get filled in earliest. A `${GEOCODE_DIR}/lock` file (PID inside, created with `O_EXCL`; stale-detection via `process.kill(pid, 0)`) keeps two daemon instances from racing. Safe to run alongside the server — the DB writes per photo are short — but a quiet window is the safest.

```sh
./bin/photo-geocode.ts                              # dry-run report
./bin/photo-geocode.ts --apply --langs en,ja        # chunked backfill, fetch + write
```

#### `dump-exif.ts` (converter)

Sibling utility in [converter/bin/](../converter/bin/). Prints the raw EXIF for one or more files — useful when debugging "why didn't this photo get processed" or "what tag is the converter looking at." Run via `npm run dumpexif -- <files>` from the converter directory.

#### `start-prod.sh` / `start-dev.sh`

Wrapper scripts that source `.env` from the current working directory, prepend the workspace's `node_modules/.bin` to `PATH`, and start the process under pm2 (prod) or in the foreground (dev). One pair per package — server, converter, and react-app. See the top-level README's Multi-Instance and Dev Mode sections for the invocation patterns.

## Public API

### Access control

Two flags carry the entire model:

- **`user.is_admin`** — global admin. Bypasses every per-gallery check; can do everything the API exposes.
- **`is_editor`** on `user_gallery` / `group_gallery` — gallery-editor tier. Can edit photo data on the gallery's photos and update most gallery settings; cannot delete the gallery itself or change `hostname` (instance-level concern).

A `user_gallery` or `group_gallery` row with `is_editor = 0` is a plain **view** grant — the holder can read the gallery and its photos but not modify anything.

A user's effective access is the union of:

1. Their direct `user_gallery` rows.
2. The `group_gallery` rows of every group they belong to (`user_group` join).
3. `:guest`'s grants — the anonymous-visitor floor. Even a logged-in user with no direct or group grants still gets whatever `:guest` is allowed.

There's no wildcard grant target — `gallery_id` on `user_gallery` / `group_gallery` is always a real gallery ID. (The old `:all` / `:public` pseudo-galleries were retired in migration 012, which promoted `(user, :all, admin)` rows to the new `user.is_admin` flag and fanned `:public` grants out to per-gallery rows.) "Anyone-can-see" patterns are expressed by granting on each specific gallery — typically as `:guest` rows, so every user inherits them.

The `hide_map` column on `user_gallery` / `group_gallery` is an independent per-row override of the gallery's map-visibility default — three states (hide / show / inherit-from-gallery) that resolve through the same cascade as the access grant. The cascade uses the sentinel target `:all` as a "per-user default" row inside `hide_map` only (it's not a grantable gallery target).

The authorization primitives live in [`server/lib/authorizer.ts`](lib/authorizer.ts):

- `authorizeAdmin(userId)` — global admin only.
- `authorizeGalleryView(userId, galleryId)` — any grant on the gallery (direct, group, or `:guest`).
- `authorizeGalleryEditor(userId, galleryId)` — global admin OR `is_editor` on the gallery.
- `authorizePhotoEditor(userId, photoId)` — global admin OR gallery-editor on at least one of the photo's galleries. Orphan photos (no gallery links) are global-admin-only.

The **virtual-host scope** ([`server/lib/host-scope.ts`](lib/host-scope.ts)) layers on top: requests whose `Host` header matches a gallery's `hostname` regex are narrowed to that gallery's photos for both reads and writes. `requireUnscoped(request)` rejects cross-gallery admin operations on a bound hostname — `gh issue` examples in the top-level README.

### RESTful resources

The required tier is listed in brackets at the end of each route. From least to most privileged:

1. **[any]** — no auth required (anonymous OK, the request still inherits `:guest`'s grants).
2. **[user]** — any authenticated user.
3. **[gallery/view]** — any grant on the specific gallery (direct, group, or `:guest`).
4. **[gallery/editor]** — `is_editor` on the gallery, or global admin.
5. **[admin]** — global admin only.

A bracketed `[unscoped]` suffix means the route is also rejected on hostname-bound instances (cross-gallery admin operations).

- `/meta`
  - `GET` — Boot metadata for the SPA **[any]**
  - `POST` — Create a meta entry **[admin]**
  - `GET ../:key` — Read one meta entry **[admin]**
  - `PUT ../:key` — Update a meta entry **[admin]**
  - `DELETE ../:key` — Delete a meta entry **[admin]**
- `/tokens`
  - `POST` — Login, mint an access + refresh token pair **[any]**
  - `GET` — Verify the current token **[any]**
  - `DELETE` — Logout the current session **[any]**
  - `DELETE ../:userId` — Force-logout every session for a user **[admin]**
- `/users` **[unscoped]**
  - `GET` — List users **[admin]**
  - `POST` — Create a user **[admin]**
  - `GET ../:userId` — Read a user **[admin]**
  - `PUT ../:userId` — Update a user (name, password, `is_admin`) **[admin]**
  - `DELETE ../:userId` — Delete a user **[admin]**
- `/groups` **[unscoped]**
  - `GET` / `POST` / `GET ../:id` / `PUT ../:id` / `DELETE ../:id` — CRUD on user groups **[admin]**
  - `GET ../:groupId/members` / `PUT ../:groupId/members/:userId` / `DELETE ../:groupId/members/:userId` — membership **[admin]**
- `/user-gallery`, `/group-gallery` **[unscoped]**
  - List + upsert + delete the per-gallery ACL rows **[admin]**
- `/galleries`
  - `GET` — Galleries the caller can see **[user]** (filtered by access map)
  - `POST` — Create a gallery **[admin]**
  - `GET ../:galleryId` — Read a gallery + its photos **[gallery/view]**
  - `PUT ../:galleryId` — Update gallery settings; non-empty `sources` stamps the gallery hybrid, empty reverts to real **[gallery/editor]** (editors cannot set `hostname`)
  - `DELETE ../:galleryId` — Delete a gallery **[admin]**
  - `PUT ../:galleryId/icon` — Crop + render the gallery icon from one of its photos **[gallery/editor]**
  - `POST ../:galleryId/stats` — Aggregated stats for the gallery; body `{filter?, dateRange?, numericRanges?, lang?}` **[gallery/view]**
  - `POST ../:galleryId/stats/evolution` — Per-bucket time-series for a trendable category; same body shape plus `category` **[gallery/view]**
  - `GET ../:galleryId/filters` / `POST` — List + create saved filters that source from this gallery **[gallery/editor]**
  - `GET ../:galleryId/filters/:filterId` / `PUT` / `DELETE` — Read / update / delete a saved filter **[gallery/editor]**
- `/gallery-photos`
  - `GET ../:galleryId` — List photos in a gallery **[gallery/view]**
  - `POST ../:galleryId/query` — Per-view filtered fetch (year/month/day scope + filter + dateRange + numericRanges) **[gallery/view]**
  - `POST ../:galleryId/counts` — Per-day photo counts for the Year heatmap **[gallery/view]**
  - `POST ../:galleryId/neighbors` — Prev / next / first / last photos within the filtered set **[gallery/view]**
  - `POST ../:galleryId/filter-values` — Filter widget universe + filter-aware counts per category **[gallery/view]**
  - `GET ../:galleryId/:photoId` — One photo by id within a gallery context **[gallery/view]**
  - `GET ../:galleryId/by-original-filename/:filename` — Pre-rename / camera-filename fallback **[gallery/view]**
  - `PUT ../:galleryId/:photoId` — Link a photo into a gallery **[admin]**
  - `DELETE ../:galleryId/:photoId` — Unlink **[gallery/editor]**
- `/photos`
  - `GET` — Cross-gallery photo list (paginated, filterable) **[admin]**
  - `POST ../query` — Cross-gallery filtered fetch (same body shape as the gallery-scoped flavour) **[admin]**
  - `GET ../:photoId` — Read a single photo **[gallery/view]** on any gallery it's linked to (orphans require **[admin]**)
  - `PUT ../:photoId` — Update photo data (title, location, exposure, …) **[gallery/editor]** on any gallery it's linked to (orphans **[admin]**)
  - `POST ../:photoId/regeocode` — Clear `geocoded_*` columns and drop a coord sidecar for the converter daemon **[gallery/editor]** on any of the photo's galleries
  - `POST ../by-ids` — Batch fetch (cap 500), out-of-scope ids silently dropped **[user]**
  - `GET ../audit-counts` — Per-predicate tallies for the dashboard tiles **[admin]**
  - `GET ../year-months` — Per-(year, month) bucket counts for the filter timeline **[admin]**
  - `DELETE ../:photoId` — Delete a photo row **[admin]**
- `/stats` **[unscoped]**
  - `POST` — Cross-gallery aggregated stats; admin-only **[admin]**
- `/filter-values` **[unscoped]**
  - `POST` — Cross-gallery filter widget universe + counts; admin-only **[admin]**

The OpenAPI dump at `/api/v1/docs` (or `server/openapi.json` checked in) is the authoritative request / response shape for every route.

### Entities

Wire shapes are generated from TypeBox-validated route handlers. See [server/openapi.json](openapi.json) (or `/api/v1/docs` on a running instance) for the authoritative schemas.

## Internal API

The DB layer abstracts over driver implementations (`server/db/sqlite3/`, `server/db/dummy/`). The public surface is the union of methods exported from [server/db/index.ts](db/index.ts) — those are the calls models invoke. Driver internals (SQL, prepared statements, helper functions like `applyBaseline` for saved-filter galleries) live inside each driver subdirectory.
