# Photo Diary

**Photo Diary** is a calendar-based photo gallery platform for self-hosting. The photos are arranged by the date they were shot, in calendar-based views, aimed at diaries and other, date-based photography projects.

Live examples: [dailybw.misaki.fi](https://dailybw.misaki.fi) and [papusama.misaki.fi](https://papusama.misaki.fi).

Key features include:

- Calendar-based views (year, month, photo)
  - Including map from embedded GPS information
- Comprehensive photo statistics (time, gear, exposure settings, etc.)
- Fast browsing — per-view fetch narrowed by the active filter, cached client-side so filter toggles update in place
- User management and basic access control

## Contents

- [Structure](#structure)
- [Features](#features)
  - [Beta features](#beta-features)
- [Setup](SETUP.md) — basic setup, dev mode, multi-instance deployment, day-to-day ops
- [Photo pipeline](#photo-pipeline)
- [Roadmap](#roadmap)
- [Backlog](#backlog)
- [Version history](#version-history)

## Structure

Photo Diary is split into independent modules, each handling its own sub-system:

- [react-app](react-app) — front-end React SPA. Served as static files by the backend; no separate hosting required.
- [server](server) — Fastify + SQLite backend. Exposes `/api/v1` (with an OpenAPI doc at `/api/v1/docs`) and serves the bundled frontend.
- [converter](converter) — back-end worker that pre-processes new photos (EXIF extraction, configurable downscale ladder + thumbnail via sharp).

The three pieces communicate via the shared filesystem and SQLite DB rather than over a network — the converter writes one thumbnail and one or more display renditions per intake under `photos/display/<maxDim>/<id>.jpg` (the ladder is operator-configurable via the `renditions` meta key; the default is a single 1500-px rendition) and inserts the photo row into the DB on intake, processing operator JSON sidecars through the same pipeline; the server reads the DB to serve the API; `bin/photo.ts update <id>` is the operator hook for after-the-fact enrichment. Per-instance state (database, photo files, `.env`) lives in a single instance directory outside the repo; see [Setup](#setup) below.

## Features

### Galleries

- Photos segmented into galleries; one photo can belong to any number of them
- **Real galleries** — flat namespace, direct membership
- **Virtual galleries** — composed live without copying photo rows
  - Hybrid: union of one or more real galleries
  - Saved-filter: a filter snapshot baked onto a parent gallery, addressed at `/g/<id>` like any other
- Hostname-based default + admin scope — a request to a hostname matching `gallery.hostname` patterns narrows reads and admin writes to that gallery set

### Public viewer (`/g/`)

- Year / Month / Photo views — heat-mapped calendar grid, thumbnails grouped by date, full-screen photo modal with corner metadata panel (EXIF + location + date + map)
- Persistent title-bar map button (`m`) that survives year / month / photo nav, scoped to the current view's photo set
- Fast browse — per-view fetches narrowed by the active filter, TanStack Query cache, in-place refresh on filter toggles
- Arrow / swipe nav with prev/next prefetch; clickable breadcrumb (`🏠 › Gallery › 2024 › March › #1234`)
- SPA UI in `en` / `fi` / `ja` (UserMenu language picker); per-photo metadata (title, description, place) in the same three locales
- Reverse-geocoded country / state / city from Nominatim, in the visitor's locale
- 18 themes (light / dark / neutral / coloured); per-gallery override or instance-wide default
- Per-gallery `hide_map` privacy cascade — coordinates / map / location card can be suppressed per gallery, per user, or via the `:guest` baseline; same MAX-merge logic as the access grants

### Filtering

- Inline strip with italic "Category: value" chunks (× to clear individually) opens a modal of per-category cards with faceted counts; a "Show all N" sub-modal walks the natural-sort universe
- Range filters for continuous variables (focal length, aperture, shutter speed, ISO, EV, LV, resolution)
- Date range filter; missing-field chips for the audit workflow
- Within-category values are additive (OR); across categories subtractive (AND)
- Filters apply to gallery and statistics views simultaneously

### Statistics

- Per-gallery `/g/<id>/stats`; cross-gallery `/s` for admins
- **General**: summary (total photos, days, average per day), author, country, state (beta), city, location (map card)
- **Time**: year, year/month, month, weekday, hour
- **Gear**: camera make, camera, lens, camera-lens combo
- **Exposure**: focal length, aperture, shutter speed, ISO, EV, LV
- **Image**: resolution, orientation, aspect ratio
- Stacked-area Evolution chart for every trendable category with month / year granularity
- Map card with marker clustering; popup thumbnail links to the photo
- Click any value chip / chart segment to filter both stats and gallery to that subset

### Admin (`/m/*`, gated on `user.is_admin`)

- Galleries / Users / Groups / Photos / Access / Instance management surfaces, each opening item routes as layered modals over their list page
- Photo browser with bulk multi-select (shift / long-press / drag-paint), bulk Edit / Regeocode / Set-private / Set-public; same filter strip + modal pattern as `/g/`, plus audit chips (duplicates / country-mismatch / per-field missing) for the data-quality workflow
- Per-photo Private flag; per-gallery `can_see_private` grants on users + groups; public Photo modal shows a Private badge to viewers who can see it
- Editor-tier "Manage this photo" / "Set as gallery icon" buttons on the public Photo modal (gated by `user.isGalleryEditor`); pencil opens the same `PhotoDrawer` in-place over the gallery
- Per-language metadata inputs for title / description / place (en / fi / ja) on every item form; canonical column + `*_localized` overlay rows
- Virtual gallery editors — hybrid gallery's source picker, saved-filter gallery's filter builder (mounts the same `<Builder>` the public viewer uses)
- Gallery icon cropper — pick any photo, drop a square crop, written to `gallery-icons/<id>.jpg`
- Instance defaults (`defaultGallery`, `defaultTheme`, `defaultLanguage`, `initialGalleryView`, `firstWeekday`, beta feature toggles, rendition ladder) editable from `/m/instance` without an `.env` round-trip

### Authentication & authorization

- JWT sessions (90-day default); user-rotatable secret invalidates every token issued to that user
- Per-user / per-group viewer / editor grants on galleries; `user.is_admin` for instance-wide admin
- `:guest` user carries the public baseline; every user inherits its grants and individual user / group rows can only broaden them (access is `MAX` across all matching rows, never `MIN`)

### Operator scripts & deploy

- Multi-instance deploy pattern — shared code under `/opt/photo-diary/<version>/`, per-instance state under `/var/photo-diary/<name>/` (own `.env`, DB, photos, nginx vhost), atomic symlink-flip upgrade via `bin/instance.ts`
- CLI surface for everything the admin UI can do — `bin/{photo,gallery,user,group,access,meta,photo-geocode,photo-rerender}.ts`; destructive subcommands default to dry-run, opt in with `--apply`
- Inbox JSON sidecars for instance-wide default metadata on new intake
- Configurable rendition ladder via the `renditions` meta key; `bin/photo-rerender.ts` regenerates display variants from on-disk originals

### Beta features

Opt-in surfaces that aren't part of the default UI. Per-visitor toggle in UserMenu → "Beta features", or per-instance lock via `BETA_FEATURE_<NAME>=user|on|off` in the instance's `.env` (`user` (default) shows the toggle, `on`/`off` forces it for every visitor).

- **`regions`** (`BETA_FEATURE_REGIONS`) — adds a State row to the photo metadata's address line, a State filter category, a Stats State topic, and Summary "Top State" + "States variety" tiles. Backed by curated `subdivisions/{en,fi,ja}.json` keyed by ISO 3166-2. Coverage: JP, FI, DE, MY, KR, AU, CA, US (en + ja); fi covers Finnish regions and falls back to en elsewhere.
- **`focalLengthEquiv`** (`BETA_FEATURE_FOCAL_LENGTH_EQUIV`) — adds a 35mm-equivalent focal length filter category and a matching Stats Settings category. Uses EXIF `FocalLengthIn35mmFormat` when present; falls back to `react-app/src/lib/crop-factors.json` for known-no-EXIF bodies (X100F, 5D Mark II, 30D, GX7, FinePix F50fd). The MetadataPanel Settings row also appends `(N㎜ eq.)` next to the raw focal length when the values differ.

## Setup

See **[SETUP.md](SETUP.md)** for the operator guide — basic setup, dev mode, multi-instance deployment (host prep, bootstrap, nginx, per-gallery vhost mapping, upgrades), and day-to-day operations.

## Photo Pipeline

End-to-end flow from a new JPG arriving on the host to it being browsable in the gallery:

1. **Drop into `inbox/<gallery>/`.** Copy/move a JPG into the instance's `photos/inbox/<gallery>/` directory (or just `photos/inbox/` if you'd rather link to a gallery later). The converter watches this path (via chokidar) recursively and picks the file up immediately.
2. **Converter processes the file.** [converter](converter) reads the EXIF, writes one entry per configured rendition (default: a single 1500-px size) at `photos/display/<maxDim>/<id>.jpg` plus the fixed thumbnail at `photos/thumbnail/<id>.jpg`, inserts a `photo_rendition` row per display variant so the SPA's `srcset` picks it up, moves the original to `photos/original/<id>.jpg`, and **inserts the photo row into the DB** (id, originalFilename, EXIF-derived timestamp / camera / lens / exposure, dimensions). When the file came in under `inbox/<gallery>/`, it's auto-linked to that gallery in `gallery_photo` on intake. After this step the photo appears in the gallery on next page load.
3. **Geocoding fills place / country / city.** If the photo had EXIF coordinates, the converter (and the `bin/photo-geocode.ts` backfill daemon) resolves them through Nominatim and stores the result on `photo.geocoded_*` and `photo_localized.*` for the operator's extra languages.
4. **(Optional) operator enrichment via JSON sidecar.** Drop a `<name>.json` alongside (or anywhere under) `inbox/` with the fields you want to overlay onto an existing row — title, description, operator-set country / place, etc. The converter matches it back to the row by id / originalFilename + timestamp and applies the overlay. The sidecar is archived under `photos/original/<id>.intake.json` after processing.
5. **(Optional) operator enrichment via CLI.** For one-off corrections, `./bin/photo.ts update <id> --title "…" --place "…"` applies the same overrides directly. `./bin/photo.ts show <id>` prints the current row; `./bin/photo.ts delete <id>` removes one. See `./bin/photo.ts --help`.

## Roadmap

Active milestones on the way to 1.0, plus the far-out 2.0 direction. Each bullet links the GitHub milestone for live status.

- [**1.0 — Pre-release audits**](https://github.com/vlumi/photo-diary/milestone/4) — test-coverage gap analysis, frontend security audit, end-to-end UI test suite, documentation overhaul, operator-script surface tidy.
- [**2.0 — Thin server, cloud-native direction**](https://github.com/vlumi/photo-diary/milestone/18) *(direction-setting, far out)* — originals leave the server for client-side / cold storage, the converter's sharp pipeline becomes a bundled local uploader, all DB ops route through the API, storage backends behind a vendor-agnostic interface. Likely diverges from today's self-hosted-monolith shape enough that it may end up being a different product line.

## Backlog

Themes loosely held for later — full list lives as open issues without a milestone on [GitHub](https://github.com/vlumi/photo-diary/issues?q=is%3Aissue+is%3Aopen+no%3Amilestone).

- **Filter & navigation UX** — coordinate-radius filter (photos within N km of a point).
- **Gallery shape** — alternative renderers for galleries that aren't calendar-shaped.

## Version History

Third structural take on a long-running personal photo-gallery side project — predecessors at [pod.vlumi.net](https://web.archive.org/web/20131208222413/http://pod.vlumi.net/) (2004, Perl/CGI then Ruby) and [github.com/vlumi/gallery](https://github.com/vlumi/gallery) (2012, Ruby/eruby + Apache + SQLite). One-line themes per release; see [CHANGELOG.md](CHANGELOG.md) for the detail.

- **0.1–0.4** (Jul–Aug 2020) — Calendar views, auth/ACL, embedded map, per-gallery stats, photo property filters.
- **0.5 / 0.5.1** (Dec 2021 / May 2022) — `/api/v1` versioned surface + instance metadata; aspect-ratio stats. Then a long pause.
- **0.6** (May 2026) — Modernization sweep: Express 5, Node 26, ESM + TypeScript, better-sqlite3, React 19, Vite; Stats map with clustering; converter on sharp.
- **0.7** (May 2026) — Multi-instance deploy pattern (versioned code under `/opt/`, per-instance dirs under `/var/`, atomic symlink-flip upgrades); privacy `hide_map` cascade, helmet, npm workspaces.
- **0.8** (May 2026) — Fastify + TypeBox + OpenAPI on the backend; `openapi-fetch`, TanStack Query, Zustand on the frontend; Stats + Photo code-split out of the main bundle.
- **0.9** (May 2026) — Privacy hardening (403/404 collapsed), JWT expiration, self-service password change, global 401 handling, toast notifications.
- **0.10** (May 2026) — Photo modal with swipe + controlled zoom, Stats Location card with map-in-modal, clickable breadcrumb, Day merged into Month, seven new themes.
- **0.11** (May 2026) — Reverse-geocoded place hierarchy: structured Nominatim data on intake, backfill daemon, operator-vs-geocoded audit; converter hardens around filename collisions.
- **0.12** (May 2026) — Geocoded surfaces across the app: per-language city / state / country in MetadataPanel, new filter categories and Stats topics, beta-gated 35mm-eq focal length.
- **0.13** (Jun 2026) — Admin frontend bundle (`/m/*`) behind `user.is_admin`: dashboard, Photos, Galleries, Users, Groups, Access; TypeBox-validated mutations, ACL groups, six new themes.
- **0.14** (Jun 2026) — Admin UI polish: slug ids, bulk Edit / Regeocode, dashboard audit tiles, filter-sidebar timeline, gallery-icon cropper, gallery-editor tier, mobile pass.
- **0.15** (Jun 2026) — Composition + scale: hybrid galleries, saved filters as pseudo-galleries, per-language metadata, date-range filter, stats evolution chart; per-view `/query`/`/counts`/`/neighbors` endpoints.
- **0.16** (Jun 2026) — Filter & viewing UX polish: redesigned filter widget (inline strip + per-category modal cards with faceted counts), continuous-variable range filters, stacked-area evolution chart, virtual-gallery edit page + hybrid-source admin UI, persistent map modal.
- **0.17** (Jun 2026) — Admin UI shift to layered modals + Section card primitive; per-photo visibility + editor-tier admin actions on `/g/`; `/m/instance` page with runtime-overridable `meta` defaults; configurable rendition ladder + collapsed `photos/display/<maxDim>/` layout; `/m/photos` filters move into a modal; Stats Evolution adds `weekday` and `hour`; Finnish geocoding cleanup (state-code lvl fallthrough + script-rule address blob filter).

See the [Roadmap](#roadmap) for what's in flight after 0.17.
  
