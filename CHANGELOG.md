# Changelog

## [Unreleased]

### Server

- User / gallery / group ids tighten to a lowercase slug shape: `^[a-z0-9][a-z0-9_-]*$` (lowercase alnum, may contain `_` / `-`, must start with alnum). Schema migration 017 lowercases any existing uppercase ids and cascades the change through the FK columns (`user_gallery`, `user_group`, `session`, `group_gallery`, `gallery_photo`). Login lowercases the typed id before lookup so iOS-autocapitalized "Admin" matches a stored `admin`. INSERT-time pattern validation lives in the model + TypeBox schemas; the migration's PK UNIQUE constraint surfaces existing case-collisions on first run. (part of #476)
- `user` gains a mutable `name` display column and `group.title` renames to `group.name` (migration 018, backfill `user.name = id`), with matching `PUT /users/<id>` body, `bin/user.ts set-name`, and `bin/group.ts --name` flag. (part of #476)
- New `PUT /api/v1/galleries/<id>/icon` endpoint (gallery admin) that crops a photo's `display/` variant into a 1:1 / 160×160 JPEG under `photos/gallery-icons/<id>.jpg` and updates `gallery.icon` to point at it. Uses sharp (new server dep, same version as the converter). `gallery.icon_source` TEXT column added via migration 016 stores `{photoId, crop:{x,y,width,height}}` so the editor can re-open the cropper against the same source and crop rect. Source pool is the gallery's own photos. `bin/gallery.ts delete` (and the matching API endpoint) now removes the icon file too. The display variant — not the original — drives the crop, so icon generation works regardless of whether the server keeps originals on disk. (part of #457)
- New `POST /api/v1/photos/by-ids` endpoint (admin) returning the requested photos in one shot, capped at 500 ids, with host-scope enforced (out-of-scope ids silently dropped). Drives the Manage bulk-edit modal's pre-fill so a 50-photo selection doesn't fan out to 50 individual GETs. (part of #451)
- New `GET /api/v1/photos/audit-counts` endpoint (admin) returning per-predicate tallies (`orphan`, `duplicates`, `countryMismatch`, plus `missing.<field>` for every `MissingField` the filter chips support) over the in-scope catalogue. Keys match the photos-page query-string params so the Manage dashboard's audit tiles deep-link to `/m/photos?<key>=…` with the matching chip pre-active. (part of #454)
- New `GET /api/v1/photos/year-months` endpoint (admin) returning per-(year, month) photo counts over the filtered + scoped set, sorted newest-first. Takes the same filter query as `/photos` minus `dateFrom` / `dateTo` (which would tautologically narrow the timeline itself); other chips (orphan / missing / duplicates / countryMismatch / gallery / q) all apply so the bucket set reflects the current filter. Drives the Manage Photos sidebar's month-picker timeline. (part of #455)
- `countryMismatch` predicate now also flags rows where `geocoded.countryCode` is set but the operator-set `taken.location.country` is empty — a one-click backfill candidate. The previous strict semantic (both sides set + different) hid any row where the operator slot never got populated even though geocoding had resolved a value. Affects the filter chip, the CLI's `bin/photo.ts audit --country-mismatch`, and the new dashboard tile. The reverse asymmetry (operator set, geocoded empty) stays silent — geocoding may simply not have run.
- New "no country" sentinel `xx` (user-assigned ISO 3166 code) for photos taken in international waters / outside any nation. `lib/photo-filter.ts` exports `COUNTRY_SENTINEL` and the `countryMismatch` predicate now treats the sentinel as a deliberate "no country" value — the audit no longer flags it as a mismatch against any geocoded country code. `isMissing(country)` already treats the sentinel as set (it's a non-empty string), so the row stops surfacing in `missing-country` too. (part of #486)
- Converter's `geocodeAtIntake` now backfills `taken.location.country` from the freshly-fetched `geocoded.countryCode` when the operator slot is empty. Lets regeocode (single-photo or the new bulk action, #483) double as a fix for the backfill-candidate rows the expanded `countryMismatch` flags. Imports gain the same behaviour: when EXIF has no country but Nominatim resolves one, the photo lands with country populated. Operator-set countries are never overwritten. (part of #483)

### Frontend

- Admin photos: bulk-action bar grows an "Edit fields…" button alongside Link / Unlink / Delete; the modal lists every writable field at once with a per-field checkbox, pre-populated from the selection's current values (shared values shown verbatim, mixed values render an italic `<mixed>` placeholder à la Lightroom), and ticked rows are folded into one `PhotoUpdatePatch` looped per-row over the selection. (closes #451)
- Admin photos: bulk-action bar grows a "Regeocode…" button (between Edit fields and Delete) that loops `POST /api/v1/photos/<id>/regeocode` over the selection — same per-row pattern as the other bulk actions. Confirm modal explains that each row clears its `geocoded_*` columns immediately and drops a coord sidecar for the converter daemon to re-fetch out-of-band. (closes #483)
- PhotoDrawer's read-only meta rows for `ID` and `Original filename` grow a small clipboard icon that copies the value via `navigator.clipboard.writeText`; flips to a check icon for 1.5s after a successful copy. Hidden when the clipboard API is unavailable (non-HTTPS dev origins). (closes #484)
- PhotoDrawer country typeahead suggestions no longer get clipped by the photo's map view. The dropdown's `z-index: 10` lost to leaflet's internal panes (200–700) and to its control containers `.leaflet-top` / `-bottom` (1000) that wrap the +/− zoom buttons; bumped to 1100 so the typeahead floats above the map and its controls, while staying below the modal layer (2000) used by the bulk-action backdrops. (closes #488)
- PhotoDrawer geocoded row no longer reads "Not geocoded yet" for photos taken in international waters. Display priority: shared `country / state / city` when city is set; else the first populated maritime field from Nominatim's address blob (`ocean` / `sea` / `bay` / `strait` / `gulf`); else "No location data" when `geocoded.noData` is true (Nominatim explicitly returned nothing); else the existing "Not geocoded yet" (daemon hasn't run). (closes #489)
- PhotoDrawer and the bulk Edit fields modal share a `CountrySelect` typeahead that pins a "No country" option at the top of the dropdown (under the "Clear" option when a country is set). Matches the new `xx` sentinel from `country-sentinel.ts`. Saves the literal `xx` into `taken.location.country`. Gallery `MetadataPanel` and `Thumbnail` render the localised "No country" label instead of the raw `XX`, and skip the `FlagIcon` (no real flag exists for the sentinel). Stats country grouping and `SummaryModal` thread the `t` function through so the label renders correctly in their tooltips and tables. i18n key `country-sentinel-label` in en / fi / ja. (closes #486)
- Manage Photos sidebar grows a Timeline section below the date-range inputs: one row per year that has photos in the current filter set, click to expand into a 4×3 grid of month cells. Picking a month sets `dateFrom` to the first day and `dateTo` to the last day; clicking the active month again clears the range. Bucket counts (the total per year, per-month inside the expanded grid) recompute against every other filter chip so the timeline reflects "of the currently-filtered photos, this many landed in YYYY-MM" rather than the whole catalogue. The expanded year auto-tracks the current `dateFrom` / `dateTo` so deep-linking into a month-narrowed URL opens the right grid. New `month-short-{1..12}` i18n keys in en / fi / ja. (closes #455)
- Manage dashboard grows a "Catalogue audit" tile strip above the navigation tiles, one card per non-zero filter-chip predicate (orphan, duplicates, country mismatch, missing-{taken,coords,place,country,author,title,description}). Clicking a card lands on `/m/photos` with the matching chip pre-active. Cards with count zero are hidden so the strip reads as "what's still to fix". `state-code` is intentionally absent — the Photos page filter chip list excludes it (countries with no ISO-3166-2 subdivisions permanently match with no operator-editable fix), so a tile would land on an unfiltered view; CLI audit (`bin/photo.ts audit --missing state-code`) keeps the surface. Drawer save, delete, regeocode, and bulk actions invalidate the count query so the strip stays current as the operator works. (closes #454)
- Manage Users list and edit form surface the new `user.name` column; Manage Groups + GroupEdit / GroupCreate rename "Title" → "Name"; access subject pickers append `— name` after the id when one is set. (part of #476)
- Global Manage / Stats surfaces hide on hostname-bound instances. The server-side `requireUnscoped` guard (#386) rejects cross-gallery admin endpoints on a bound hostname with a 404, but the SPA was still rendering the Dashboard tiles, the UserMenu Statistics entry, and the landing-page Statistics shortcut card — clicks 404'd silently. New `useHostScope` hook reads the host-scope from the same primitive the breadcrumb / picker use; Manage Dashboard swaps its global tile set for the bound gallery's tiles (edit / photos / access) and single-gallery scope auto-redirects `/m` straight to `/m/g/<id>`; visiting any global Manage route bounces to `/m`; UserMenu drops the Statistics entry; landing-page drops the Statistics card; `/s` redirects to `/g`. (closes #462)
- Gallery editor's icon field swaps the path input for a cropper. Adjust button opens a modal with `react-easy-crop`; the operator picks a photo from the gallery's own grid, pans / zooms / locks a 1:1 square crop, saves. The server renders the icon JPEG and stores the source + crop rect alongside, so re-opening the cropper later loads the same source with the saved rect ready to tweak. Create flow keeps the legacy text input — the cropper endpoint needs a saved gallery row to target; pick from photos after creating. (closes #457)
- Meta-driven config (`PHOTO_ROOT_URL`, `DEFAULT_GALLERY`, `DEFAULT_THEME`, `INITIAL_GALLERY_VIEW`, `FIRST_WEEKDAY`) now syncs during render in `App.tsx` rather than inside a `useEffect`. The previous shape ran the sync after render, so the first render with fresh meta left descendants reading stale module-load values — visible as picker icons resolving against the wrong root URL on cold-load of `/g`. Beta-feature modes (zustand state) keep their effect, since those writes do trigger downstream re-renders.
- Home button always lands on the tile picker. The no-galleryId redirect ladder (single-visible-gallery → `DEFAULT_GALLERY`) moves off `/g` and onto `/` (the bare-instance landing). `/g` becomes pure picker. Direct visits to `/` keep the smart-redirect behaviour; clicking Home from inside a gallery (on instances with a `DEFAULT_GALLERY` or a single visible gallery) no longer bounces straight back into the same gallery. Manage and Global Stats Home buttons retarget to `/g` for the same effect. (closes #468)
- Access add-grant rows on `/m/access` and `/m/g/<id>/access` now label the Inherit / Show / Hide dropdown with "Map visibility" so the three context-less words don't make the operator guess what the select does. Per-row controls inside the access table stay unchanged — their column header already disambiguates. (closes #464)
- Identifier inputs (login username, new user / gallery / group ids, gallery hostname regex) opt out of mobile autocapitalize / autocorrect / spellcheck via `autoCapitalize="none"`, `autoCorrect="off"`, `spellCheck={false}`. iOS Safari was capitalizing the first letter of the username on the login page, producing `Admin` for a case-sensitive lookup that expected `admin`; the same default applied to every other identifier-shaped field. Free-text fields (title, description, place, country typeahead) unchanged. (closes #465)
- Instance `DEFAULT_THEME` (from `/api/v1/meta`'s `defaultTheme`) now actually applies on the Manage and Global Stats surfaces. The meta-to-config side-effect runs *after* render, so the first render with fresh meta still saw `config.DEFAULT_THEME = "blue"` (the hardcoded module-load baseline) and the mutated value never triggered another render. App.tsx, Gallery/index.tsx, and GlobalStats/index.tsx now read `meta?.defaultTheme` directly, falling back to `config.DEFAULT_THEME` only when meta hasn't resolved yet. GlobalStats also drops its own `<Global>` since the App-level one now handles theming for every route.

## [0.13.0] - 2026-06-06

### Server

- Coord-change geocoded-clear is now consistent across every path that mutates `taken.location.coordinates`: the admin `PUT /api/v1/photos/<id>` already did it (#415); the converter's JSON-sidecar `processJson` now does it too (was only refilling via `geocodeAtIntake` and only when `REVERSE_GEOCODE` was enabled — a sidecar with the feature off, or a failed Nominatim fetch, would leave stale geocoded values pinned to the previous location); and `bin/photo.ts update --latitude / --longitude / --altitude` gains the same semantic. Shared `coordsDiffer` / `mergeCoords` / `readCurrentCoords` extracted to `server/lib/photo-coords.ts` so the three call sites can't drift.
- New `POST /api/v1/photos/<id>/regeocode` (admin) clears `geocoded_*` and drops a coord sidecar for the converter daemon to re-fetch — "this row's geocoded data drifted, refresh as-is". The admin photo drawer's read-only section grows a small "Refresh" button next to the geocoded row that hits this endpoint. `bin/photo.ts regeocode <id>` mirrors it for the CLI.
- Reverse-geocode cache now stores the raw Nominatim response and re-runs `extract()` on every read. Previously the cache stored the extracted struct; when `extract()` learned a new field (e.g. `stateCode` in May's disambiguation work), existing cache files predated the field and silently served undefined — leaving the matching DB column NULL even though Nominatim's data was present in the archived `address` blob. Cache files written under the old shape stay readable (their top-level `address` is what `extract` consumes either way), so no cache wipe is required to apply the fix.
- `bin/photo-geocode.ts` gains a `--wipe-cache` flag — dry-run by default, opt-in to delete via `--apply`, confirmation prompt unless `--yes`. Wipes every per-lang JSON under `$GEOCODE_DIR/cache/`; doesn't touch DB rows or photos. For the rare case the operator wants to force a Nominatim re-fetch.
- SPA fallback handler now serves `index.html` for `/m`, `/m/*`, `/s`, and `/s/*` in addition to `/g` and `/g/*` — refreshing or deep-linking any admin / stats URL no longer 404s at the server. Previously only `/g` routes were covered, so the admin and stats surfaces (added during 0.13) silently broke when the SPA wasn't entered through the gallery side.
- `loadGalleryPhoto` in the sqlite3 driver was building `WHERE id IN (…) AND AND id = ?` — a SQL syntax error that `requirePhotoInScope` then silently swallowed and surfaced as 404 on every photo detail request under a host-scoped gallery. Drop the stray "AND " prefix on the second predicate; add a regression test against a real in-memory sqlite (the dummy driver had its own correct implementation, so the existing test suite missed it).
- `upsertUserGallery` / `upsertGroupGallery` built `ON CONFLICT … DO UPDATE SET` with an empty SET clause when the caller passed neither `is_admin` nor `hide_map` — a SQL syntax error. Switch to `DO NOTHING` in the empty-set case so "ensure the row exists" is a valid call shape.
- sqlite3 driver gains parity tests across every exported function (meta, user, session, access cascade, group + group-gallery, gallery, gallery_photo, photo + originalFilename + orphan / audit / geocoded / localized / rename). The dummy driver kept its own parallel implementation, which masked the SQL bugs above — driver-level tests now exercise the real SQL against `:memory:` so future regressions land at test time, not in prod.
- `photo.exif_at_intake` TEXT column (migration 014) captures the camera's full EXIF / properties blob at converter intake; the admin photo drawer surfaces a per-field "↺ revert to EXIF" affordance, and gates EXIF-derived edits with a "no backup" unlock on rows that pre-date the column (NULL blob). (part of #416)
- `PUT /api/v1/photos/<id>` with changed coordinates now synchronously clears the row's `geocoded_*` columns + drops a JSON sidecar into `photos/inbox/`, so the running converter daemon picks it up and refreshes the geocoded fields via Nominatim. The operator never sees stale geocoded values pinned to the previous coords. (closes #415)
- `GET /api/v1/photos` accepts filter query params (`gallery`, `orphan`, `dateFrom`, `dateTo`, `missing`, `duplicates`, `countryMismatch`, `q`) and returns a paginated `{ photos, page, pageSize, total }` shape sorted newest-first; predicates lifted into `server/lib/photo-filter.ts` so `bin/photo.ts audit` and the admin endpoint share one definition. (part of #10)
- ACL user groups — `group` / `user_group` / `group_gallery` (migration 013) compose into the access cascade as another positive-grant source, exposed via `/api/v1/groups` + `/api/v1/group-gallery` and routed through `bin/{user,group,gallery}.ts` as `bin/access.ts` retires. (closes #270)
- ACL simplification — access collapses to a global `user.is_admin` flag plus per-(user, gallery) `is_admin` boolean rows; pseudo-galleries (`:all`, `:public`) and NONE deny rows drop out; migration 012 promotes the legacy data. (closes #394)
- Virtual-host scope — requests on a `Host` matching a gallery's `hostname` regex narrow both reads and writes to that gallery; cross-gallery admin ops 404; the SPA mirrors the scope client-side. (closes #386)
- Retired the `:private` pseudo-gallery — orphan visibility moves to the admin UI's orphan filter; the alert theme stays. (closes #385)
- Mutation endpoints (`POST` / `PUT` / `DELETE`) shipped across `/api/v1/{meta,users,galleries,photos}` with TypeBox-validated bodies and proper status codes. (closes #222)
- Photo mutations are field-locked to the override set `bin/photo.ts update` exposes; EXIF and `geocoded.*` columns reject with 400 and stay owned by the converter and `photo-geocode.ts`.
- Fastify's default `removeAdditional: 'all'` is replaced with `false`, so routes opting into `additionalProperties: false` reject unknown body fields instead of silently dropping them.
- `models/user.ts` consolidates the bcrypt-hash + secret-rotation + cascade logic so user / gallery / photo `DELETE` go through the same path from CLI and API.
- Meta `key` is locked to a schema-seeded enum (`name | description | cdn | image`); internals like `schema_version` are reachable only via `./bin/meta.ts set --force`.
- New `/api/v1/user-gallery` resource — `GET /` (with `userId` / `galleryId` filters), `PUT /:userId/:galleryId`, `DELETE /:userId/:galleryId`; admin-only.

### Frontend

- Six new built-in themes: Amber (warm orange / burnt gold) and Lavender (cool violet) fill colour-wheel gaps in the Coloured group; Sage (muted dusty green) and Slate (mid-grey with a deep-slate header) sit between Coloured and Neutral; Midnight (navy-tinted dark) and Espresso (warm brown-tinted dark) round out the Dark group with chromatic warmth that `dark` and `amoled` don't offer. None apply a CSS filter to the photos themselves — only `grayscale` retains the photo-filter behaviour; the new entries leave photos untouched and only tint the UI chrome. (closes #279)
- Theme picker becomes a shared swatch grid component used in both the UserMenu and the gallery editor. Each tile renders in its own theme's three lead colors (page background, header band, primary text glyph) so the palette is scannable at a glance; the selected tile gets a thick primary-color border plus a check overlay; the theme's display name shows under each tile. Categories stay grouped (Coloured / Neutral / Dark / Statement). UserMenu's picker also previews live on hover — moving away or closing the menu restores the committed value; clicking commits as the user preference. Gallery editor's picker updates form state only (save commits). The theme `<Global>` lifted to App.tsx so the user-preference repaint applies on every route, not just Gallery / GlobalStats — without it the picker had no visible effect when used from `/m`. (closes #458)
- Admin Photos page gains multi-select with bulk actions. Each tile carries an always-visible checkbox affordance (top-left); selecting one flips the grid into selection mode implicitly — further tile clicks then toggle selection. With nothing selected, clicking a tile opens the edit drawer (the conventional gallery-grid affordance for "edit this one"). Shift-click extends a range from the last toggle anchor regardless of mode. The result-summary row exposes a `Select page` / `Clear page` shortcut, always visible. When the selection is non-empty, a bulk-action bar appears above the grid with Unlink from gallery, Delete, and (cross-gallery view only) Link to gallery; each action opens a centered modal and loops the existing per-row endpoint sequentially with inline progress + error. The Link button is hidden inside `/m/g/<id>/photos` — linking is conceptually a cross-gallery action and belongs on `/m/photos`. (part of #10)
- Gallery editor theme picker now mirrors the user-menu picker: grouped by category (Coloured / Neutral / Dark / Statement) in canonical manifest order, with each option labelled by display name rather than the raw enum id. The hardcoded arbitrary order is gone; both pickers now read the same `theme.manifest`. Admin photos page's gallery facet + bulk picker also sorts galleries by visible title (not server's id order), since the operator sees titles, not slugs.
- Global Statistics page gains a Galleries section at the top — one row per gallery showing photo count + share, plus an "(no gallery)" row for orphans; clicking a row drills into that gallery's per-gallery stats at `/s/<id>`. `/api/v1/photos` now attaches each photo's gallery memberships to the response so the count is computed client-side without a second fetch. (closes #444)
- Per-gallery stats title bar gains a `Statistics` breadcrumb between Home and the gallery dropdown for admins, linking back to `/s` (global stats). Without it, the Galleries-section drill from `/s` into `/s/<gallery>` was a one-way trip. Non-admins are unchanged. (closes #447)
- Global Statistics page at `/s` — admin-only, aggregates every photo in the catalogue (paginated fetch under the existing `/api/v1/photos` endpoint) through the same Stats / Filters UI the per-gallery `/s/<gallery>` view uses. The shared `uniqueValues` build moves out of `Gallery/index.tsx` into `lib/uniqueValues.ts` so the two pages can't drift. (part of #404)
- Landing page gains admin-only quick-access cards for `/m` (Manage) and `/s` (Statistics), shown above the gallery picker. UserMenu picks up a parallel `Statistics` entry next to the existing `Manage` one. Non-admins see no change. Discoverability fix for the global stats and admin surfaces that until now were URL-typing only from the landing.
- Admin UI shell — `/m/*` (global) + `/m/g/<gallery>/*` (gallery-scoped) routes with placeholder sub-pages, a `Manage` tab in the title-bar context group, and a `Manage` entry in the UserMenu, all gated on `user.isAdmin`. (part of #10)
- Public ↔ admin photo navigation closes the loop: a "Manage this photo" floating button on the public photo view (admins only, below the fullscreen button) jumps to the photo's gallery-scoped admin drawer; the admin drawer's header carries a return link back to the same photo's public view. The admin photos grid highlights the open photo's tile and auto-scrolls to the page containing it via a new `photoIdFocus` query param on `GET /api/v1/photos`. (closes #427)
- Admin dashboard at `/m` replaces the placeholder with a grid of nav tiles (Photos / Galleries / Users), each linking to its sub-page; the UserMenu gains a "Manage" entry for admins. The global `/m/*` pages are now reachable without typing the URL or starting from a gallery's Manage pill. (closes #421)
- Admin Users list at `/m/users` replaces the placeholder — rows of id / role (admin badge), Add user button. Click a row to land on `/m/users/<id>` with a read-only summary and Edit + Delete actions; Edit toggles into a form covering password (leave empty to keep) and the global admin flag. Create at `/m/users/new` client-validates the id pattern (must not start with `:`). Self-account password change has its own hint pointing at the existing Change password modal (the admin endpoint rotates the secret and revokes the current session). Deleting cascades user_gallery rows + revokes sessions. (part of #10)
- Admin Groups page at `/m/groups` — list rows of id / title / description; create at `/m/groups/new`; view + edit on `/m/groups/<id>` with a Members section that drops a user-picker and per-row remove icons backed by `PUT/DELETE /api/v1/groups/<id>/members/<userId>`; delete shows an inline confirm panel explaining the FK cascade (memberships + group_gallery grants). Dashboard gains a Groups tile. (part of #10)
- Admin per-gallery Access at `/m/g/<id>/access` replaces the placeholder — two tables (User grants + Group grants) each row exposing the admin flag (checkbox) and map visibility (Inherit / Show / Hide select); changes upsert immediately. Add-grant row at the bottom of each table picks from the corresponding list (filtered to whoever doesn't already have a grant). Remove icon clears the row. (part of #10)
- Admin global Access at `/m/access` — flat sortable table of every grant (user_gallery + group_gallery), one row per (gallery × subject). Columns sort by header click; filter chips narrow by type (user / group), role (admin / view), or gallery. Same inline edit controls per row as the per-gallery page; gallery column links back to that gallery's per-gallery Access view. Dashboard gains an Access tile. (part of #10)
- Admin Photos page (read-only) — `/m/photos` (cross-gallery) and `/m/g/<gallery>/photos` (gallery-scoped) render a paginated thumbnail grid with a faceted filter sidebar (gallery membership chips, date range, audit chips, free-text); filter state is URL-parameterised so a narrowed view is shareable. (part of #10)
- Admin breadcrumb expands to `Home → Manage → Galleries → <id> → <subpage>` with every intermediate segment as a link, so cross-scope navigation between `/m/g/<id>/...` and the cross-gallery pages is one click. (part of #10)
- Admin Photos edit panel — click a tile or visit `/m/photos/<id>` / `/m/g/<gallery>/photos/<id>` to swap the photos sidebar from filters to a writable form (title, description, author, country, place, coordinates (lat/lon/alt), camera-{make,model}, lens-{make,model}, focal, 35mm equiv, aperture); saves go through `PUT /api/v1/photos/<id>`; matching `missing=…` filter chips highlight the empty field and a hint explains the match; geocoded fields surface read-only with a note that they stay stale until `bin/photo-geocode.ts` re-runs. The server's `PhotoUpdateBody` now also accepts `coordinates` and `focalLength35mmEquiv` — EXIF doesn't always carry them and the SPA's crop-factors fallback doesn't cover every body. (part of #10)
- Drawer country field becomes a typeahead picker — reuses the lang-store's `i18n-iso-countries` instance, no new dependency or network call. Stores the alpha-2 code on the form; filters by localised name or code as you type; "Clear country" option above the list unsets. (closes #414)
- Drawer Location section gains an embedded Leaflet map — the marker is draggable and click-on-map repositions it; both write the new coordinates back into the lat/lon inputs. Typing into the inputs recentres the map. Bundled lazily so the leaflet payload doesn't load until the admin opens a photo. (closes #413)
- Admin breadcrumb resolves raw IDs to readable labels (gallery title, photo filename), drops the verbose "Photos in gallery" leaf in favour of "Photos" since the parent crumb already disambiguates, and adds a future-proof `/m/inbox` branch. (closes #422)
- Admin breadcrumb stops emitting a leaf for the open photo on `/m/photos/<photoId>` and `/m/g/<id>/photos/<photoId>`. The photoId in the URL drives the sidebar drawer's open state (so deep-links still work), but the drawer isn't a navigation level — its own header names the photo, the breadcrumb stays at "Photos". (part of #10)
- Admin Galleries list at `/m/galleries` replaces the placeholder — sortable rows showing id / title / hostname / theme, each row links to a per-gallery edit form at `/m/g/<id>` exposing the same field surface as `bin/gallery.ts update` (title, description, icon, epoch + type, theme, initial view, hostname). Save goes through `PUT /api/v1/galleries/<id>`. (part of #10)
- Admin Galleries gains create + delete — "Add gallery" button on `/m/galleries` opens a new-gallery form at `/m/galleries/new` (id field client-validated against the server's pattern; on success redirects to the new gallery's edit page); Delete button on `/m/g/<id>` reveals an inline confirm panel warning that photos go orphan and per-user access rows are removed, then calls `DELETE /api/v1/galleries/<id>` and returns to the list. Edit + create share a `GalleryFormFields` module so the field surface stays in lockstep. (part of #10)
- Stats moves to `/s/<gallery>`, parallel to `/g/<gallery>` (viewing) and the upcoming `/m/` (management, #10); the `:all` / `:public` plumbing retires alongside. (part of #404)
- User-side theme picker in the UserMenu — pick a built-in theme or "Follow gallery default"; persisted per-browser, overrides the gallery and instance defaults. (closes #287)

### Tooling

- `bin/photo.ts` restructures around by-id ops — new `show <id>` / `update <id>` / `delete <id>` subcommands replace the file-driven default, which retires now that the converter owns intake. (closes #400)
- `bin/gallery.ts` switches to explicit subcommands (`list` / `create` / `update` / `delete` / `audit`), so `gallery.ts list` no longer silently creates a gallery called "list." (closes #395)

## [0.12.1] - 2026-05-31

### Frontend

- Photo modal URL with an unknown id no longer spins on "Loading" — the router now redirects to the gallery's month view when the id doesn't resolve. As a bonus, if the URL param matches a photo's `originalFilename` anywhere in the gallery, redirects to that photo's canonical URL (pre-rename bookmarks + "shared the camera filename not the URL" links now resolve).

## [0.12.0] - 2026-05-31

### Frontend

- Photo modal carousel no longer renders the current photo on the right-side slide when swiping past the last photo. `GalleryModel.isFirstPhoto` / `isLastPhoto` now compare by `id()` instead of strict reference equality, matching how `currentPhotoIndex` already works — robust to the gallery model rebuilding between renders.
- Photo modal drag past a gallery edge now stays bounded. The carousel `dragConstraints` were expressed in the wrong reference frame (relative to translate-origin 0 rather than the track's resting `motion.x = -window.innerWidth`), so dragging from the last (or first) photo immediately snapped the track toward 0 and exposed the neighbouring slide. Corrected to `[-2 × innerWidth, 0]` with edge variants that lock at rest.
- Photo modal photo no longer animates from oversized to fit-size when opening on viewports wider than the modal's 1400 px max-width. The carousel Slide and Content Root each set `min-width: 0` so the flex-item default `min-width: auto` doesn't let those ancestors grow to the photo Frame's explicit width during initial mount; without it the over-large initial Frame triggered a ResizeObserver feedback loop that shrunk the photo by ~16 px per frame over ~7 frames. Same loop also caused a one-frame stretch of the outgoing photo at the end of the slide animation.
- Photo modal `Content` measures container dimensions in `useLayoutEffect` instead of `useEffect`, so the corrective rect read happens before the first paint.
- Photo modal MetadataPanel's reverse-geocoded line is now hand-assembled per UI language from `geocoded_city` + `geocoded_country_code` only (state and district omitted — data quality across countries / languages isn't reliable enough to bucket on). Western locales (en, fi) render `City, Country 🇫🇮`; Japanese renders `🇯🇵 国 都市` (flag-at-start because the country leads in CJK address order). The flag is always positioned alongside the country name, not at a fixed end of the row.
- `hide_map` privacy toggle now suppresses every location-derived surface — Photo modal location rows (operator place / country flag and geocoded line), the Stats General topic's Country category, and the country / geotagged filter categories (both the new-filter category picker and any already-applied chips). Coordinates and map were already hidden today.
- New City filter category and Stats Places table (under General, gated by `hide_map`) drawn from `geocoded_city`, with each city's country flag alongside; cities are keyed by `(country, state||stateCode, city)` so same-named cities (Springfield IL vs MO, Cambridge UK vs MA) stay distinct, and the displayed label only adds a state / country qualifier when there's a collision in the current dataset. Photos without a geocoded city are omitted entirely (no UNKNOWN bucket). Summary KPIs gain a Cities variety count and a Top City tile.
- New opt-in beta surface (UserMenu → "Beta features") adds a State row to the address line, a State filter category, a Stats State table, and Summary "Top State" + "States variety" tiles. State names come from curated `subdivisions/{en,fi,ja}.json` keyed by ISO 3166-2 (`geocoded_state_code`), dynamic-imported per language. Initial coverage: JP, FI, DE, MY, KR, AU, CA, US (en + ja); fi covers Finnish regions and falls back to en elsewhere.
- Per-language city overlay layered on top of the Nominatim merge. `cities/{en,fi,ja}.json` keyed by `<country>:<en_city>` (Tokio, Soul, Tukholma, Peking, Pietari, …) — overrides apply at every city display surface (metadata address line, filter chip, Stats Places, Summary Top City). Always-on (no beta gate), purely additive. Seed includes the well-known foreign exonyms for fi + ja; entries without overrides fall through to the existing merged Nominatim value.
- `photo_localized.geocoded_city` for `lang=ja` is now ignored at the read merge if it contains no Japanese script (kanji / hiragana / katakana). Nominatim's `?accept-language=ja` falls back to local Latin forms when OSM has no Japanese label, so those values were leaking through as "ja" but were actually English / Swedish / etc. The fallback chain now skips them automatically and lands on the en canonical + city overlay.
- New opt-in beta feature "Focal length 35mm equivalent" (UserMenu → "Beta features") surfaces a `focal-length-eq` filter category and a Stats Settings category keyed by the 35mm-equivalent value. Uses EXIF `FocalLengthIn35mmFormat` when present; falls back to `focalLength × cropFactor` for the small `react-app/src/lib/crop-factors.json` table (currently X100F, 5D Mark II, 30D, GX7, FinePix F50fd — covers ~85% of the gap in the operator's gallery). Unknown body + missing EXIF → `unknown` bucket. Always-on derivation in the model; the beta gate only controls UI visibility, so flipping it on/off doesn't touch the DB.
- Photo modal MetadataPanel polished into a single coherent layout: author moved out of the panel onto a small bottom-left overlay on the photo Frame (only renders when set); description renders below the title; EXIF data flows into a 2-col label / value table (`CAMERA`, `LENS`, `SETTINGS`, `IMAGE`, `LIGHT`) with right-aligned headers; operator place keeps its own row separate from the geocoded address line (mixing them jumbled CJK ordering); coordinates row dropped (the embedded map carries that signal); map sits next to the address instead of after the EXIF table; epoch (age / day-index) lifts up under the description and gets its own slightly-more-prominent row at 85% white instead of the muted 55%; operator place / address / epoch rows right-align to visually separate the "where / when" context from the left-aligned title / description story block. Panel pinned to a fixed 360 px width so short content doesn't shrink the embedded map. (closes #354)
- Stats "Exposure" topic splits into three narrower topics — Settings (aperture · shutter · ISO · focal length), Image (resolution · aspect ratio · orientation), Light (EV · LV). The previous lumped category mixed per-shot capture parameters with derived image properties under one name; the split matches how the MetadataPanel renders the same data on the photo modal.
- Stats expanded modal in "By value" sort mode now drops the "Other (N+)" aggregation entirely and shows every actual value. `transformData` stashes an unlimited chart-data variant on the truncated default; `Charts.tsx` swaps in the full data when `sortMode === "value"`. The "Top" mode still aggregates the long tail, since that's what keeps the chart readable at a glance.
- `EpochAge` renders a localized "0 days" string when the photo is the same day as the gallery epoch instead of emitting the raw `0days-long` key — the same-day fallback was calling `t()` without a `count` parameter so i18next couldn't resolve the plural suffix.

### Server

- `GET /api/v1/gallery-photos/:galleryId` and `GET /api/v1/gallery-photos/:galleryId/:photoId` accept a `?lang=<code>` query parameter. When present and non-`en`, the response merges `photo_localized` rows over the EN-canonical geocoded fields. `db.loadGalleryPhotos` / `loadGalleryPhoto` propagate the parameter. Without `?lang=`, behaviour is unchanged.
- `db.upsertGeocoded` auto-fills `photo.country_code` from the geocoded value when the operator hasn't set one. Going forward only — no migration backfills existing rows. Keeps the operator-side country filter and Stats topic uniform across photos with coords, regardless of whether the operator manually assigned a country.
- New `photo.geocoded_state_code` column (schema migration `008`) stores Nominatim's ISO 3166-2 subdivision code (`JP-13`, `US-MA`, …) — language-independent, so it lives on the photo row, not `photo_localized`. Migration backfills the column from the JSON in `geocoded_address` for any row that has one, so existing data picks the code up without a re-geocode run. Used client-side as the city filter's disambiguating key when the localized state name is missing (Tokyo returns no `state` but does return `ISO3166-2-lvl4`).
- Schema migration `009` drops the now-dead Nominatim columns: `photo.geocoded_state`, `geocoded_district`, `geocoded_place`, plus the matching `photo_localized` columns. State names are derived from `geocoded_state_code` via curated subdivision JSON, district was never displayed, and the hand-assembled City+State+Country address line replaced `display_name`. Intake / daemon write paths and the city tuple key's Nominatim-state fallback all prune alongside.
- `db.linkGalleryPhoto` is idempotent (`INSERT OR IGNORE`) — re-linking a photo already in a gallery is a no-op instead of a `UNIQUE` error. Also makes `PUT /api/v1/gallery-photos/:galleryId/:photoId` properly idempotent.
- New `photo.focal_35mm_equiv` column (schema migration `010`) holds EXIF `FocalLengthIn35mmFormat` (the converter already extracted the value, but it was silently dropped at the write layer until now — no column existed). Schema-only — backfill of existing rows is an operator step. Used by the new Stats Settings 35mm-equiv category and the matching filter category when the beta toggle is on.
- `meta-v1` camelizes the env-driven `BETA_FEATURE_<NAME>=user|on|off` keys so multi-word feature names like `focalLengthEquiv` round-trip cleanly. `BETA_FEATURE_FOCAL_LENGTH_EQUIV=on` now reaches `betaFeatures.focalLengthEquiv`; the previous lower-only conversion only worked for single-word names like `regions`.
- Migration post-check error now explicitly names the FK shape ("child gallery_photo row references missing photo") and points at `bin/gallery.ts audit --orphan-photos` instead of just saying "foreign-key violations detected", so an operator hitting it doesn't have to dig through the migration log to figure out what to fix.

### Converter

- Watcher accepts `.json` files alongside `.jpg`, and reads `inbox/` recursively. Subdir convention: files at `inbox/<gallery>/...` auto-link to that gallery on intake; files at the root are processed without an auto-link (operator links later). Unknown gallery name → file is left in place with an error logged. JSON sidecars are processed via the same lookup-or-create path as `bin/photo.ts`, archived to `original/<id>.intake.json` (or `.1.json`, `.2.json`, … if prior intakes exist). End state: one rsync drop of SOOC + JSON straight into `inbox/<gallery>/` replaces the previous "send to inbox + scp to import/ + ssh trigger of put_to_galleries.sh" routine.
- Drop the `save-json` step that wrote `inbox/<id>.json` after each JPG intake. The DB is the source of truth; the sidecar JSON had no production consumer. Pre-existing sidecars from before this change get re-processed once at startup (contents == EXIF, so it's a harmless no-op write) and archived alongside the photo.
- JSON sidecar intake now triggers reverse-geocoding (when `REVERSE_GEOCODE=1`) for the created / updated photo — previously only the JPG path called Nominatim, so coords-via-sidecar photos never got geocoded.
- Watcher ignores macOS AppleDouble (`._*`) sidecars, and the file queue no longer stalls on a single failing intake (the error catch wasn't re-triggering the queue processor).
- JPG processing no longer renames the file to `inbox/<id>` mid-pipeline. The source file stays at its original inbox path (e.g. `inbox/<gallery>/foo.jpg`) until the final atomic move to `original/<id>`. A crash mid-pipeline leaves the file in place under its real camera filename, so a restart's `ignoreInitial: false` sweep re-processes it cleanly with the right `originalFilename` instead of picking up an id-shaped orphan and treating the id as the original camera name.

### Tooling

- `bin/photo.ts audit` defaults to a counts-only summary across every check (one line per check, plus the country-mismatch / state-code footer hints). Pass `--detail` to bring back the pre-0.12 wall-of-rows behaviour, or any restricting flag (`--missing X`, `--orphans`, …) to surface rows for that single check. `--format ids` always emits every matching id regardless. Title / description / place are operator-optional now, so the perennial wall of "missing X" rows wasn't real signal in the steady state.
- `bin/photo.ts audit --country-mismatch` footer now distinguishes "still need geocoding" from "no Nominatim coverage" (the `geocode_no_data` flag set by intake / `photo-geocode.ts` when Nominatim returned no address). Previously rows flagged as no-data were still counted as "not yet geocoded" and pointed the operator at `./bin/photo-geocode.ts` — re-running the daemon found nothing to do and the audit kept nagging. The `noData` flag is also surfaced on the mapped `Photo.geocoded` so the audit (and any other consumer) can read it.
- `bin/photo.ts` lookup-or-create helper extracted to `server/lib/photo-intake.ts` so the converter's JSON-sidecar pipeline shares the same matching chain (exact id → originalFilename + timestamp → ambiguous fallback). No behavioural change for `photo.ts` callers.
- Top-level `audit-cities`, `cleanup-localized-cities`, `normalize-cities` consolidated under a single `cities <action>` parent: `cities audit`, `cities normalize`, `cities clean-localized`. Same behaviour per action; one help-screen line instead of three.
- `bin/photo.ts cities clean-localized` lists / clears `photo_localized.ja.geocoded_city` values that contain no Japanese script (Nominatim's `?accept-language=ja` falls back to local Latin forms like `Stockholm` when OSM has no Japanese label). Sets the column to NULL but keeps the row + raw `geocoded_address` blob, so the daemon won't re-fetch and re-introduce the bad value. Dry-run by default; `--apply` to write. The read merge in `schema.ts` already skips such values automatically — this action is for storage hygiene.
- `bin/photo.ts cities normalize` rewrites `photo.geocoded_city` through `normalizeCity()` to strip admin cruft like "Stockholm Municipality" → "Stockholm". Dry-run by default; `--apply` writes. Intake (converter + daemon) applies the same normalization going forward, so the tool only needs re-running after rule changes.
- `bin/photo.ts cities audit` lists unique `(country, en_city)` pairs in the gallery and shows which languages have an override in `react-app/src/lib/translations/cities/`. Helps target the per-language overlay against actual data instead of guessing.

## [0.11.0] - 2026-05-28

### Server

- New `photo` columns (`geocoded_country_code`, `geocoded_state`, `geocoded_city`, `geocoded_district`, `geocoded_place`, `geocoded_address`, `geocode_no_data`) and a sibling `photo_localized` table for non-English language variants — schema migration `007`. English is the canonical / filter-keyed language stored on the photo row; other languages live in `photo_localized` only when actually translated. Indexes on the three drill-down levels cover the future filter / Stats Places work. Operator-set `photo.country_code` and `photo.place` stay untouched (additive — auto-populated reverse-geocode data sits alongside, doesn't replace operator-controlled values). `geocode_no_data` is a negative-result cache: when set by intake or the backfill daemon (Nominatim returned no `address`), subsequent runs skip the row instead of retrying open-water / unmapped coordinates forever. (part of #246)
- `db.upsertGeocoded(photoId, lang, fields)` driver method (sqlite3 + dummy + facade) that routes English to the photo columns and other languages to `photo_localized` via an upsert. `db.loadPhotosMissingGeocoded(lang, limit)` walks photos with coords that still need geocoding for a language, ordered by `taken` DESC (recent first, NULLs at the back) so the daemon fills in the visible / recently-shot photos earliest.
- `db.loadPhoto` / `db.loadPhotos` accept an optional `lang` parameter — when present and non-English, joins `photo_localized` and merges the localized values over the English photo columns per photo.
- New `photo.original_filename` column (schema migration `006`) records the basename the photo arrived with, backfilling existing rows to `id` so the values match pre-rename. Sets up the `(id, originalFilename, dateTimeOriginal)` lookup chain #272 needs once rename-on-import lands.
- New `db.loadPhotosByOriginalFilename(name)` driver method (sqlite3 + dummy) so the lookup chain and `bin/photo.ts search` can find photos by their human-recognised camera filename.
- New `db.renamePhoto(oldId, newId)` driver method (sqlite3 + dummy) that retargets `photo.id` and `gallery_photo.photo_id` atomically within a single transaction (FK enforcement toggled off for the rewrite, since the gallery_photo FK is RESTRICT). Powers `bin/photo-rename.ts`.
- Photo sort order tiebreaks same-second shots by `original_filename` before the random-uuid `id` — action-burst frames stay in shoot order under the new uniform id scheme, since LR's zero-padded camera counter (`_2198`, `_2200`, …) sorts lexicographically the same as numerically within a camera. The `id` remains the final tiebreaker.

### Converter

- New `converter/reverse-geocode/` module: Nominatim client with custom `User-Agent: photo-diary/<version> (<repo-url>)`, 1 RPS queue (Nominatim public usage policy), per-`(lang, coord)` file cache at `${GEOCODE_DIR}/cache/<lang>/<lat>:<lon>.json` (coords rounded to 4 decimals ≈ 11 m precision). `NOMINATIM_BASE_URL` env points at a self-hosted Nominatim if needed; `GEOCODE_DIR` defaults to `<cwd>/.geocode/`. (part of #246)
- Converter intake reverse-geocodes new photos with coords when `REVERSE_GEOCODE=1` is set in the instance's `.env`. English is always written (canonical / filter-keyed); `REVERSE_GEOCODE_EXTRA_LANGS=ja,fi` lists additional languages to fetch at intake. Each extra language is one extra 1 RPS Nominatim call per photo. Failures (network, no address) leave the geocoded fields empty with a log line. Opt-in by default — privacy trade-off (coords go to a third-party service). (part of #246)
- Converter renames every imported JPEG to a stable `<YYYY-MM-DDTHH-MM-SS>-<16-hex-uuid>.<ext>` at intake — timestamp from EXIF `DateTimeOriginal` (fallback file mtime), 64-bit UUID portion for collision-free disambiguation and brute-force resistance under `bin/photo-rename.ts --scramble` (#332). Display / thumbnail / original / sidecar JSON all share the new id; the original camera filename rides along on `photo.original_filename` for `bin/photo.ts` lookup. Counter-rollover collisions stop overwriting each other. (closes #272)
- Converter dedup at intake reuses the existing row's id when both `originalFilename` and EXIF `DateTimeOriginal` match — covering Lightroom re-exports of the same shot (files overwrite in place, EXIF-derived columns refresh) and JSON-first stubs that carry the capture timestamp (enrichment lands before the SOOC, merges on intake). Opinion columns (title, country, place, author, description) are preserved — `photoMapToRow` only touches columns present in the input. Without a timestamp match the converter never merges: two same-named files could be unrelated photos (counter rollover, multi-camera), and originalFilename alone isn't proof of identity.
- Converter now inserts a minimal photo row into the DB at JPEG intake — id, originalFilename, EXIF-derived `taken`/camera/lens/exposure, file dimensions — so `bin/photo.ts <enriched.json>` becomes pure update rather than create-or-update. Opinion fields (title, country, place, author, …) stay empty for the operator's enrichment JSON. Skip-if-exists so re-imports don't clobber prior enrichment. (closes #223)

### Frontend

- Stats Location card splits the geotagged count into two click-to-filter chips when the gallery has a mix — `N geotagged` and `M not geotagged` chips apply a `general / geotagged / yes|no` filter to the whole Stats view (same toggle behaviour as the existing Country / Camera tables). Uniform cases collapse to a single line (`All N photos geotagged` / `No photos geotagged (of N)`); no filter affordance when there's nothing to filter on. Backed by a new `geotagged` case in `PhotoModel.matches`. (closes #336)

### Tooling

- New `bin/photo-geocode.ts` operator script: backfill daemon for photos missing reverse-geocoded data. Walks the DB recent-first by capture timestamp (visible photos filled in earliest) and writes via the same `db.upsertGeocoded` path the converter uses at intake. Defaults to a dry-run report; pass `--apply` to actually fetch and write. `--langs en,ja` overrides the default set (`en` + `REVERSE_GEOCODE_EXTRA_LANGS` from `.env`); `--limit N` chunks the backfill; `--force` runs even when `REVERSE_GEOCODE` isn't set (one-off backfills on an instance that keeps intake-time geocoding off); `--yes` skips the confirmation prompt. A PID lock at `${GEOCODE_DIR}/lock` (`O_EXCL` + stale-detection via `process.kill(pid, 0)`) keeps two daemon invocations from racing the same row. (part of #246)
- `bin/photo.ts audit --country-mismatch`: surfaces photos where the operator-set `country_code` and Nominatim's `geocoded_country_code` disagree — operator-vs-geocoded drift the operator should decide on (the operator value wins by default; geocoded is informational). Photos with coords still missing geocoded data are reported as a separate count, not mixed into the mismatch list, with a pointer to `bin/photo-geocode.ts`. The check runs alongside the existing missing / orphan / duplicate checks when no filter is given. `--format ids` emits one id per line, suitable for piping into a batch country-fix script. (closes #246, closes #346)
- `bin/photo.ts audit` subcommand: surfaces rows with missing data (`--missing taken|coords|place|country|author|title|description`), orphan gallery links (`--orphans`), or shared `originalFilename` (`--duplicates`); no flag runs every check. `--format ids` emits one id per line for piping into batch fixers (`xargs -I{} ./bin/photo.ts {} --place "..."` etc.). New `db.loadOrphanPhotoIds()` driver method (sqlite3 + dummy + facade) powers the orphan check. (part of #337)
- `bin/gallery.ts audit`, `bin/user.ts audit`, `bin/access.ts audit`, `bin/meta.ts audit`: data-completeness checks for the rest of the operator-script surface. Gallery: `--missing title|description|icon|epoch`, `--empty`, `--orphan-photos`, `--orphan-galleries` (gallery_photo rows whose referenced photo or gallery is gone — directly surfaces the FK violations the migrate post-check otherwise blames the wrong migration for). User: `--no-access` (users with no user_gallery rows), `--no-admin` (warns if no user has ACCESS_ADMIN on `:all`). Access: `--orphan-users`, `--orphan-galleries`. Meta: `--missing` (known keys with empty values), `--unknown` (keys outside the schema-seeded set). All scripts accept `--format ids` for pipe-friendly output. Backed by new `db.loadOrphanGalleryPhotoLinks`, `loadEmptyGalleryIds`, and `loadOrphanUserGalleryRows` driver methods. (closes #337)
- New `bin/photo-rename.ts` operator script: `--migrate` (default) renames legacy-IDed rows (and their `display/` / `thumbnail/` / `original/` files) to the `<YYYY-MM-DDTHH-MM-SS>-<16-hex>.<ext>` scheme from #272 — idempotent, safe to re-run. `--scramble` re-rolls the UUID portion of every row's id (URL-leak mitigation; old permalinks 404). Defaults to a dry-run preview; pass `--apply` to actually rename. `--yes` skips the confirmation. File renames execute first, DB updates after — on DB failure the file moves are rolled back. Inbox sidecars are intentionally left as-is — the system never looks at them by filename, and operators routinely keep custom-named JSONs in inbox/ as audit-trail artefacts. (closes #332)
- `bin/instance.ts` upgrade-mode output reorganises around the recommended path: a "Next — cycle pm2 …" heading with the command block, a single-line "Note:" caveat (down from four), a horizontal rule, then a "Rollback — ONLY if the steps above didn't work" block. New `--quiet` / `-q` flag suppresses informational output (errors and warnings still surface) for scripted re-runs; missing-key warnings now route to stderr where they belong. (closes #284)
- New `bin/meta.ts` operator script (`list` / `get` / `set [--force]`) paralleling `bin/{user,gallery,photo,access}.ts` so the `meta` table can be read and written without `curl` against `/api/v1/meta` or raw SQL; unknown keys rejected by default, `schema_version` hard-blocked, per-instance `bin/meta.ts` symlink wired up via `bin/instance.ts`. (closes #269)
- `bin/photo.ts` restructured into yargs subcommands: the previous bare-positional behaviour becomes the default `$0 <files..>` command, and a new `search <originalFilename>` subcommand lists photos sharing a camera filename (collision triage). The default command grows a lookup chain (`id` → `(originalFilename, taken.instant.timestamp)` → ambiguous-error on rows-exist-but-no-timestamp-match → create on no candidates) so enrichment JSONs with the SOOC filename still find rows renamed by #272 while never silently merging onto the wrong photo across a camera-counter rollover. `bin/photo.ts` also defaults `originalFilename = id` on new-row creation so existing `{ id, taken, ... }` operator JSONs work as-is. (part of #272)
- Drive-by fix in the sqlite3 driver's `metaMapToRow`, which produced empty SET clauses on `db.updateMeta` until the new `bin/meta.ts` exercised that path.
- Pin yargs to `.locale("en")` across all operator scripts (`bin/instance.ts` + `server/bin/{meta,user,gallery,photo,access}.ts`) so a non-English shell locale (`LANG=ja_JP.UTF-8` etc.) no longer half-translates `--help` against fully-English status / error text.

## [0.10.0] - 2026-05-26

### Frontend

- Merge the standalone Day view into Month — `/g/<gallery>/<year>/<month>/<day>` now scrolls the highlighted day into view within Month rather than rendering a dedicated per-day page (shared/bookmarked day URLs still work).
- Photo view becomes a modal overlay on top of its parent Month — closing returns to Month exactly as the user left it (scroll position, filter UI state) without remount. (part of #276)
- Photo modal metadata moves to a toggleable corner panel so the photo fills the modal's full vertical space; date/time stays persistently visible in the toolbar centre. (closes #306)
- Photo view gains controlled zoom — mouse-wheel and `+` / `=` / `-` / `0` keys to zoom (clamped 1×–8×), drag to pan when zoomed past fit; swipe-nav is suppressed while zoomed. (closes #277)
- Gallery Title bar carries a clickable breadcrumb path (`🏠 › Gallery › 2024 › March › #1234`); the Navigation bar below reorganises into left/right control groups. (closes #275)
- Stats inline map collapses into a Location card in the General topic that opens the full map in a modal on demand; the inline 800px-tall map is gone, Leaflet stays lazy-loaded until the modal is opened, and the page reserves the scrollbar gutter so the modal lock no longer reflows underlying content. (part of #278)
- Year and Month footer maps replaced with a map button in the Title bar's breadcrumb row that opens the same modal scoped to the current year or month; the inline footer map (and the per-view Footer wrapper) is gone. (closes #313)
- Title bar's Gallery/Statistics dropdown becomes a two-pill segmented control so the alternate view is a one-click affordance — same visual language as the Stats expanded-table modal's Top / By value toggle. Switching back to Gallery after a Statistics detour now also returns to the same year/month/day (or photo) the user left from, instead of dropping at the gallery root. (closes #316)
- Navigation row gains an Up button on the left for one-tap scope climbing (Photo → Month, Month → Year, Year → galleries list); the breadcrumb is the source of truth for the path but doesn't stick to the viewport, so the new button stays in reach on long pages. (closes #319)
- Title-row map button now also appears on the Statistics page (matches Year/Month/Photo); the Stats Location card stays in place for the geotagged-count summary and as the home for upcoming reverse-geocoded place fields. (closes #320)
- Photo modal swipe becomes a touch-tracking 3-slide carousel via framer-motion — the previous and next photos peek from the edges as the user drags horizontally, and the same slide animation runs on prev / next keyboard arrows and prev / next button clicks. Swipe down past 20 % of viewport (or with sufficient velocity) closes the modal. First / Last (Home / End) jumps skip the animation by design. As a prerequisite, all in-app navigation between sibling photos / months / years (and the Title-bar context switcher) moves from `setRedirect → <Navigate>` (which unmounted the modal between transitions) to `useNavigate()` (URL changes in place, the modal stays mounted) — keyboard arrow nav and prev/next button clicks no longer flash the underlying view. (closes #175)
- Month view's per-day boundaries are sharper without changing the underlying dense wrap-flex layout: the day chip widens (25 → 50 px), gains a bolder day number, and grows a thin left accent column so the day boundary reads even when several days share a row. The day-highlight from #274 changes from a soft per-photo tint band to a stronger tint with continuous top + bottom inset rules — the highlighted day reads as a designed band rather than a wash, with no per-day container needed. (closes #290)
- Server-side logout: clicking *Log out* now revokes the session on the server. Login issues a short-lived (15 min) access JWT plus a long-lived (90 day, sliding window) opaque refresh token tracked in a new `session` table; `POST /api/v1/tokens/refresh` rotates the refresh token and mints a new access token; `DELETE /api/v1/tokens` with the refresh token in the body deletes the session row. The SPA's openapi-fetch client gains a refresh-on-401 middleware that tries one refresh before falling through to the global session-expired login modal, with concurrent 401s coalesced so a rotating refresh token isn't consumed twice. `bin/user.ts passwd` (without `--keep-secret`) and the self-service password change endpoint both cascade-delete the user's sessions so the secret rotation actually kicks every device out. (closes #256)
- Stats `TableModal` and `SummaryModal` now lock body scroll while open so the underlying stats grid no longer drifts behind the modal — matches the Photo modal and the new MapModal from #278.
- Unified the modal scroll-lock into a `useBodyScrollLock` hook (Photo / Stats Map / Stats Table / Stats Summary): locks `body.overflow` and pads `body.padding-right` by the measured scrollbar width so the layout doesn't reflow and the backdrop covers the full viewport including the scrollbar-gutter area.
- Stats category tables cap at 10 rows inline (top 10 by count) with the full distribution one click away in a floating modal — click the title or the trailing "+ N more…" row to open it.
- Stats inline tables always sort by count desc so every category reads as a "top N"; the natural order is still available in the expanded modal.
- Stats expanded-table modal gains a `Top` / `By value` sort toggle on every data category, defaulting to `Top` to match the inline view.
- Stats Summary category gains an expand modal with Period / Peaks / Variety / Most-common sections and tie-aware leader rendering for near-flat distributions.
- Stats summary KPIs (photos / average / years / months / days) move to a card-based grid — bordered tiles with icon, uppercase label, and prominent numeric value.
- Stats topic title bar (vertical `General` / `Time` / `Gear` / `Exposure` labels) now extends to the full topic height on Firefox via CSS Grid (was clipped under flex).
- Ship seven new built-in themes (`dark`, `amoled`, `forest`, `silver`, `showcase`, `teal`, `paper`) and convert `bw` from a monochrome-filter theme into a true high-contrast light theme; picked via `DEFAULT_THEME` in `.env` or the per-gallery `theme` column.
- Title bar gains keyboard shortcuts: `m` toggles the map modal, `g` jumps to Gallery, `s` jumps to Stats — the `g` path honours the remembered last-gallery URL. Shortcuts skip when an input / select / textarea is focused so the gallery dropdown's native letter-search keeps working. (closes #327)

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
