# Photo Diary

**Photo Diary** is a calendar-based photo gallery platform for self-hosting. The photos are arranged by the date they were shot, in calendar-based views, aimed at diaries and other, date-based photography projects.

Live examples: [dailybw.misaki.fi](https://dailybw.misaki.fi) and [papusama.misaki.fi](https://papusama.misaki.fi).

Key features include:

- Calendar-based views (year, month, day, photo)
  - Including map from embedded GPS information
- Comprehensive photo statistics (time, gear, exposure settings, etc.)
- Fast browsing — gallery content (apart from actual photos) loaded once at startup
- User management and basic access control

## Contents

- [Structure](#structure)
- [Setup](#setup)
  - [Basic setup](#basic-setup)
  - [Dev mode](#dev-mode)
  - [Multi-instance deployment](#multi-instance-deployment)
    - [Host prep](#one-time-host-prep) · [Getting the code](#getting-the-code-onto-the-host) · [Bootstrap](#bootstrapping-a-new-instance) · [Start](#starting-an-instance) · [Upgrade](#upgrading-an-instance) · [nginx](#nginx) · [Per-gallery vhost](#per-gallery-vhost-mapping) · [Day-to-day ops](#operating-an-instance)
- [Features](#features)
  - [Beta features](#beta-features)
- [Photo pipeline](#photo-pipeline)
- [Roadmap](#roadmap)
- [Backlog](#backlog)
- [Version history](#version-history)

## Structure

Photo Diary is split into independent modules, each handling its own sub-system:

- [react-app](react-app) — front-end React SPA. Served as static files by the backend; no separate hosting required.
- [server](server) — Fastify + SQLite backend. Exposes `/api/v1` (with an OpenAPI doc at `/api/v1/docs`) and serves the bundled frontend.
- [converter](converter) — back-end worker that pre-processes new photos (EXIF extraction, thumbnail/display renditions via sharp).

The three pieces communicate via the shared filesystem and SQLite DB rather than over a network — the converter writes `photos/{display,thumbnail}/` renditions and inserts the photo row into the DB on intake, processing operator JSON sidecars through the same pipeline; the server reads the DB to serve the API; `bin/photo.ts update <id>` is the operator hook for after-the-fact enrichment. Per-instance state (database, photo files, `.env`) lives in a single instance directory outside the repo; see [Setup](#setup) below.

## Setup

### Basic Setup

Quickstart for a single personal instance. For the full production layout (multi-version code under `/opt/`, per-instance dirs under `/var/`, nginx vhosts, atomic upgrades, backup) see [Multi-Instance Deployment](#multi-instance-deployment) below; for an in-repo dev setup without an instance dir at all, see [Dev Mode](#dev-mode).

1. **Prerequisites + install.** Node.js 22 or newer (npm 10+ recommended for workspaces). From the repo root, `npm run setup` installs every workspace ([server](server), [converter](converter), [react-app](react-app)) and builds the frontend into [server](server)/`build/`.
2. **Bootstrap the instance directory** with [`bin/instance.ts`](bin/instance.ts). It creates the dir tree (`photos/{inbox,original,display,thumbnail}/`), generates `.env` with a fresh random `SECRET`, links `code` to this checkout, and surfaces operator shortcuts at `<instance>/bin/{photo,gallery,user,access}.ts`:

   ```sh
   ./bin/instance.ts <name> --base <parent-dir>
   ```

   Default `--base` is `/var/photo-diary` (the production layout); pass any other path for a personal setup. See [Bootstrapping a new instance](#bootstrapping-a-new-instance) for the dir layout, `.env` keys, and re-run-as-doctor semantics.
3. **Start the processes** via the per-instance `start-prod.sh` scripts (pm2-managed; the DB file is created at `<instance>/db.sqlite3` on first start and the migration runner bootstraps the schema on every start):

   ```sh
   cd <parent-dir>/<name>
   ./code/server/bin/start-prod.sh
   ./code/converter/bin/start-prod.sh
   ```

4. **Seed the first user, gallery, and admin grant** via the per-instance operator shortcuts. See [server/README.md](server/README.md) for the full management toolkit and the access-control model:

   ```sh
   ./bin/user.ts passwd <user> <password>
   ./bin/gallery.ts <gallery-id> --title "<Title>"
   ./bin/access.ts level <user> :all admin
   ```

5. **Set the instance `cdn`** — the public URL that serves `display/`, `thumbnail/`, and `gallery-icons/` (typically the same nginx host):

   ```sh
   ./bin/meta.ts set instance_cdn https://photos.example.com/
   ```

   This overrides the frontend's `/` default at runtime; the bundle itself ships no per-instance config. The same value can also be set via the `/api/v1/meta` API or `UPDATE meta SET value='…' WHERE key='instance_cdn'` directly if the operator script isn't reachable.

### Dev Mode

Mirror the prod layout with a dev "instance" inside the repo. The init script wires it up the same way as a real deploy, but with the `code` symlink pointing at the live source:

```sh
./bin/instance.ts dev --base .
```

That gives you `<repo>/dev/` with `.env`, `photos/{inbox,…,thumbnail}/`, `code → <repo>` (the `dev/` path is gitignored, so the bootstrapped state won't pollute the repo). Each of server, converter, and react-app has a `bin/start-dev.sh` wrapper — run them in the foreground (tsx watch / vite, no pm2):

```sh
cd dev
./code/server/bin/start-dev.sh        # terminal 1
./code/converter/bin/start-dev.sh     # terminal 2
./code/react-app/bin/start-dev.sh     # terminal 3 (vite dev server, proxies /api/* to localhost:4200)
```

If you don't need photos in dev, you can also just `cd server && npm run dev` — the DB will land at `server/db.sqlite3` and you skip the instance-dir ceremony entirely.

### Multi-Instance Deployment

One VM can host several Photo Diary instances under a single nginx, each pointing at its own code-clone via a `code` symlink in the instance directory. The frontend has no build-time per-instance config, so a single `npm run setup` per code checkout (run once when the checkout is created) covers every instance using that checkout.

Directory layout:

```text
/opt/photo-diary/                       # parent dir, owned by the deploy user (see below)
  0.11.0/                               #   each version unpacked into its own subdir
  0.14.0/                               #   so different instances can run different versions
                                        #   and upgrades are atomic (flip a symlink)

/var/photo-diary/
  dailybw/                              # one directory per instance
    .env                                # per-instance config (see below)
    code -> /opt/photo-diary/0.14.0      # symlink to the code version this instance runs
    db.sqlite3                          # auto-created on first server start
    photos/
      inbox/  original/  display/  thumbnail/
  travel/
    .env
    code -> /opt/photo-diary/0.11.0     # different instance, possibly on a different version
    db.sqlite3
    photos/
      …
```

Single-version setups can drop the version subdirectory (`/opt/photo-diary/` for the code, `code -> /opt/photo-diary` per instance).

#### One-time host prep

Create the two parent directories (code at `/opt`, per-instance state at `/var`) owned by the deploy user, so subsequent steps don't need `sudo`:

```sh
sudo install -d -o "$USER" /opt/photo-diary /var/photo-diary
```

#### Getting the code onto the host

GitHub auto-generates a source tarball for every tag. Extract it directly into a version subdirectory of `/opt/photo-diary/` with `tar --strip-components=1` (no rename step), then run `npm run setup` to install everything and build the bundled frontend:

```sh
V=0.14.0
mkdir -p "/opt/photo-diary/$V"
curl -L "https://github.com/vlumi/photo-diary/archive/refs/tags/v$V.tar.gz" \
  | tar xz -C "/opt/photo-diary/$V" --strip-components=1
cd "/opt/photo-diary/$V"
npm run setup
```

Repeat this block for each new version you want to land on this host.

#### Bootstrapping a new instance

The `bin/instance.ts` script handles directory creation, `.env` generation (with a fresh random `SECRET`), the `code` symlink, and the per-instance `bin/` shortcuts in one shot. Invoke it from the version of the code you want the instance to run:

```sh
/opt/photo-diary/0.14.0/bin/instance.ts dailybw
```

That creates `/var/photo-diary/dailybw/` with everything wired up — including `/var/photo-diary/dailybw/bin/{photo,gallery,user}.ts` symlinks so the routine operator commands are short paths (`./bin/photo.ts …` instead of `./code/server/bin/photo.ts …`). The script can be invoked from any working directory; the instance dir is derived from the name (and the `--base <dir>` flag, default `/var/photo-diary`, if you want instances under a different parent). Re-running on an existing instance acts as a doctor — verifies the directory tree, checks for missing required `.env` keys, reports `✓`/`✗`. Add `--fix` to append any missing keys with defaults (without touching existing values).

The generated `.env` covers the required keys. Optional per-instance frontend defaults can be added — these flow through `/api/v1/meta` to the frontend on boot:

```sh
DEFAULT_GALLERY=dailybw
DEFAULT_THEME=grayscale
BETA_FEATURE_REGIONS=user   # `user` (default) | `on` | `off`
```

`BETA_FEATURE_<NAME>` locks a beta feature for this instance: `on` enables it for everyone (hides the per-browser toggle), `off` disables it for everyone, `user` (default) shows the toggle in the UserMenu so each visitor can opt in. See the [server README](server/README.md#environment-variables) for the full env table.

#### Starting an instance

```sh
cd /var/photo-diary/dailybw
./code/server/bin/start-prod.sh
./code/converter/bin/start-prod.sh
```

Both `start-prod.sh` scripts source `.env` from the current working directory, then start pm2 with names derived from `INSTANCE_NAME` (`<name>` and `<name>-converter`). `pm2 save` after a successful start so they come back on reboot.

#### Upgrading an instance

Re-run `bin/instance.ts` from the new version of the code, then **delete + start** pm2 (not `restart`):

```sh
pm2 stop dailybw dailybw-converter
/opt/photo-diary/0.14.0/bin/instance.ts dailybw          # backs up the DB, flips the symlink
pm2 delete dailybw dailybw-converter                    # drop cached metadata
cd /var/photo-diary/dailybw
./code/server/bin/start-prod.sh                         # migration runner applies any schema bumps
./code/converter/bin/start-prod.sh
pm2 save
```

`pm2 restart` won't pick up the symlink flip — pm2 caches the resolved script path and the package.json version at the original `start` time, so a restart re-execs the *old* paths and `pm2 list` keeps showing the previous version. `delete` + `start-prod.sh` forces re-resolution and is the only reliable upgrade path today.

The DB backup is named `db.sqlite3.pre-<new-version>` — a plain file copy that assumes the instance is stopped (started instances may have an inconsistent backup). Rollback is manual: `cp db.sqlite3.pre-<version> db.sqlite3`, point `code` back at the older version, then the same `pm2 delete && start-prod.sh` cycle.

#### nginx

One server block per instance, proxying to its `PORT` (set in the instance's `.env`). nginx also serves `display/`, `thumbnail/`, and `gallery-icons/` directly from disk — the server never streams photos, only their metadata. The `cdn` meta row (set via `./bin/meta.ts set instance_cdn …` — or the [API](server/README.md) / raw SQL as fallback) tells the frontend which URL to load images from; typically the same host the API is on.

A realistic per-instance vhost with TLS, certbot-managed certs, proxy headers, and aggressive caching on the photo locations:

```nginx
server {
  listen 80;
  server_name dailybw.example.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name dailybw.example.com;

  ssl_certificate     /etc/letsencrypt/live/dailybw.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/dailybw.example.com/privkey.pem;
  ssl_protocols       TLSv1.2 TLSv1.3;
  ssl_ciphers         HIGH:!aNULL:!MD5;

  # API + bundle — proxied to the per-instance pm2 process.
  location / {
    proxy_pass         http://127.0.0.1:4201;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
  }

  # Photo bytes — served directly from disk. The IDs are content-stable (the
  # converter writes by EXIF-derived ID), so we can mark these immutable.
  location /display/ {
    alias /var/photo-diary/dailybw/photos/display/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    access_log off;
  }
  location /thumbnail/ {
    alias /var/photo-diary/dailybw/photos/thumbnail/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    access_log off;
  }

  # Gallery icons — written by the cropper at `<galleryId>.jpg`. The path
  # is stable but the bytes are not (operator can re-crop), so short
  # cache and no `immutable`.
  location /gallery-icons/ {
    alias /var/photo-diary/dailybw/photos/gallery-icons/;
    expires 1d;
    access_log off;
  }

  # If you push photos via the admin API (POST /api/v1/photos), bump this —
  # the default 1 MB rejects most camera files. Skip if you only use the
  # converter-inbox flow (which doesn't go through nginx).
  client_max_body_size 50m;
}
```

Get the cert via `certbot --nginx -d dailybw.example.com` (it'll insert the `ssl_*` lines and the http-to-https redirect for you on a clean vhost; the block above is what you'll end up with).

Use a different `PORT` per instance (set in each instance's `.env`) — pm2 ensures the right server gets the right port.

**Don't expose `inbox/` or `original/`.** Only `display/` and `thumbnail/` are meant to be public. After processing, the converter moves the raw image into `original/` (archived camera files — full EXIF, full resolution) and leaves the JSON sidecar in `inbox/`. The sidecars carry the full extracted EXIF including raw coordinates, which bypasses the `hide_map` privacy cascade if served directly. If you write a catch-all `location ~ /(display|thumbnail|inbox|original|…)` regex against the photo root, you're publishing both. Stick to per-directory `alias` blocks or anchor the regex to just the public dirs (e.g. `^/(display|thumbnail)/`).

#### Per-gallery vhost mapping

A single instance can serve multiple hostnames, each landing the visitor on a different gallery, without spinning up a separate instance. The mechanism is the `hostname` regex column on the `gallery` row — when the frontend boots on a host that exactly one gallery's regex matches, it redirects to that gallery instead of the gallery-list page.

Worked example. One instance (`/var/photo-diary/multi/`) serves two domains, each landing on its own gallery:

1. Create the galleries with hostname regexes:

   ```sh
   cd /var/photo-diary/multi
   ./bin/gallery.ts dailybw --title "Daily B&W" --hostname '^dailybw\.example\.com$'
   ./bin/gallery.ts travel  --title "Travel"    --hostname '^travel\.example\.com$'
   ```

   The regex is matched with JavaScript's `RegExp.prototype.test` against `window.location.hostname` — anchors and escapes follow standard JS regex syntax.

2. One nginx vhost per hostname, both proxying to the **same** backend port (the single instance):

   ```nginx
   server {
     listen 443 ssl http2;
     server_name dailybw.example.com;
     # ... ssl_certificate, proxy headers, /display/, /thumbnail/ as above ...
     location / { proxy_pass http://127.0.0.1:4201; ... }
   }

   server {
     listen 443 ssl http2;
     server_name travel.example.com;
     # ... same ssl_certificate (or a separate cert), same proxy headers ...
     location / { proxy_pass http://127.0.0.1:4201; ... }
   }
   ```

3. The frontend selects which gallery to land on based on the hostname the visitor used. The fallback order is: single-gallery instance → matching `hostname` regex → `DEFAULT_GALLERY` env var → the gallery-list page.

Gotchas:

- If two galleries' regexes both match the visitor's hostname, the frontend falls through to the next step (no redirect) since the match isn't unambiguous. Anchor your regexes with `^` and `$` to avoid accidental overlap.
- The `/display/` and `/thumbnail/` aliases point at the **same** photo directory (the instance's `photos/`), so the bytes are shared across the per-gallery vhosts. That's intentional — galleries in the same instance are just different curations of the same photo pool.
- `cdn` is a single meta value per instance, not per gallery. All the vhosts on one instance share it; usually that means setting `cdn` to one of the hostnames (say the primary one) and letting the others load images cross-origin from it.

#### Operating an instance

Common day-to-day operations after an instance is running:

```sh
pm2 list                                  # see all running processes, status, restarts, mem/cpu
pm2 logs dailybw                          # tail server logs for this instance
pm2 logs dailybw-converter --lines 1000   # tail converter logs, more history
pm2 restart dailybw dailybw-converter     # restart both halves after a config edit
pm2 stop dailybw dailybw-converter        # stop both
pm2 delete dailybw dailybw-converter      # stop and remove from the process list
pm2 save                                  # persist the current process list (resume on reboot)
pm2 startup                               # one-time: generate the boot script
```

Log files live at `~/.pm2/logs/<name>-out.log` and `~/.pm2/logs/<name>-error.log` (separately for the server and converter halves). They rotate automatically only if you install [pm2-logrotate](https://github.com/keymetrics/pm2-logrotate): `pm2 install pm2-logrotate`.

**Backup.** Two pieces matter:

- `<instance>/db.sqlite3` — the source of truth for users, galleries, ACL, and photo metadata. Plain `cp` works if pm2 is stopped; for live backups use the SQLite online-backup API: `sqlite3 db.sqlite3 ".backup '/backups/$(date +%F)-db.sqlite3'"`.
- `<instance>/photos/{original,display,thumbnail}/` — the bytes themselves. `inbox/` is transient (the converter empties it), no need to back it up.

The `bin/instance.ts` upgrade flow already creates `db.sqlite3.pre-<version>` snapshots before flipping the `code` symlink — those are good restore points for a downgrade, but they're not a substitute for off-host backups.

**Common symptoms and where to look:**

| Symptom | First thing to check |
| --- | --- |
| Server won't start | `pm2 logs <name>` — most common: missing `SECRET` in `.env`, port already in use, or the migration runner threw on a DB inconsistency. |
| Converter logs "Invalid photo-repository directory structure" | The `photos/{inbox,original,display,thumbnail}/` subdirs aren't all present — re-run `./bin/instance.ts <name>` (or `bin/instance.ts <name>` from the code root) to recreate any missing ones (idempotent). |
| `no such table: …` after upgrade | A migration didn't apply. Check `sqlite3 db.sqlite3 "SELECT value FROM meta WHERE key='schema_version'"` and the server log on startup for "Applying N DB migration(s)". |
| Frontend loads but `/api/v1/galleries` 401s | The user's token expired or the `SECRET` changed across restarts — login again. |
| Map widget missing where you expected it | The `hide_map` cascade is hiding it; check with `./bin/access.ts list` (filter to `--user <id>` or `--gallery <id>` if needed) and the privacy doc in the server README. |

## Features

- Photos are segmented into galleries
  - Each photo can be in any number of galleries
  - Single level – no nesting
  - One gallery view at a time
  - Special galleries for more abstract concepts
    - :all includes all photos
    - :public includes all photos added to galleries
  - Hostname-based default gallery selection — and `Host`-bound admin/read scope: a request to a hostname matching one or more `gallery.hostname` patterns is narrowed to that set, both reads and admin writes (cross-gallery work is unreachable from a virtual host)
- SPA view
  - Fast transition between views
    - Pre-load current gallery
  - Fast navigation to previous/next item
    - Left/right arrow keys
    - Swipe left/right
    - Pre-load previous/next photo
  - Year view – Calendar with heat-mapped days
  - Month view – Thumbnails grouped by date
  - Day view – Thumbnails
  - Single photo view – Maximize to visible space, with photo properties
- Statistics view
  - General statistics
    - Summary: total photos, total days, average per day
    - By author
    - By country
  - Time distribution by year, year/month, month, weekday, hour
  - Gear distribution by camera make, camera, lens, camera/lens
  - Exposure distribution by focal length, aperture, shutter speed, sensitivity, EV, LV, resolution, orientation, aspect ratio
  - All distribution values can be used to filter the photos
    - Filters apply to both gallery and statistics views
    - Filter values within a single category are additive, photos matching any are included
    - Filter values across categories are subtractive, photos only matching all are included
- Authentication
  - User login
  - Token-based
    - User-specific secrets for simple revocation
- Authorization
  - Restricted access to galleries and functionality
    - No access restrictions planned for the actual photo content, which may be in a CDN
  - Multiple access levels
    - No access
    - View access
    - Admin access
  - Access levels granted by scope
    - Global scope (:all)
    - Public scope (:public)
    - Gallery scope
  - Default access level
    - Through guest user (:guest), inherited by all users
    - Inheritance may be overridden by broadening or narrowing access

### Beta features

Opt-in surfaces that aren't part of the default UI. Per-visitor toggle in UserMenu → "Beta features", or per-instance lock via `BETA_FEATURE_<NAME>=user|on|off` in the instance's `.env` (`user` (default) shows the toggle, `on`/`off` forces it for every visitor).

- **`regions`** (`BETA_FEATURE_REGIONS`) — adds a State row to the photo metadata's address line, a State filter category, a Stats State topic, and Summary "Top State" + "States variety" tiles. Backed by curated `subdivisions/{en,fi,ja}.json` keyed by ISO 3166-2. Coverage: JP, FI, DE, MY, KR, AU, CA, US (en + ja); fi covers Finnish regions and falls back to en elsewhere.
- **`focalLengthEquiv`** (`BETA_FEATURE_FOCAL_LENGTH_EQUIV`) — adds a 35mm-equivalent focal length filter category and a matching Stats Settings category. Uses EXIF `FocalLengthIn35mmFormat` when present; falls back to `react-app/src/lib/crop-factors.json` for known-no-EXIF bodies (X100F, 5D Mark II, 30D, GX7, FinePix F50fd). The MetadataPanel Settings row also appends `(N㎜ eq.)` next to the raw focal length when the values differ.

## Photo Pipeline

End-to-end flow from a new JPG arriving on the host to it being browsable in the gallery:

1. **Drop into `inbox/<gallery>/`.** Copy/move a JPG into the instance's `photos/inbox/<gallery>/` directory (or just `photos/inbox/` if you'd rather link to a gallery later). The converter watches this path (via chokidar) recursively and picks the file up immediately.
2. **Converter processes the file.** [converter](converter) reads the EXIF, generates display- and thumbnail-sized renditions (via sharp), writes them to `photos/{display,thumbnail}/<id>.jpg`, moves the original to `photos/original/<id>.jpg`, and **inserts the photo row into the DB** (id, originalFilename, EXIF-derived timestamp / camera / lens / exposure, dimensions). When the file came in under `inbox/<gallery>/`, it's auto-linked to that gallery in `gallery_photo` on intake. After this step the photo appears in the gallery on next page load.
3. **Geocoding fills place / country / city.** If the photo had EXIF coordinates, the converter (and the `bin/photo-geocode.ts` backfill daemon) resolves them through Nominatim and stores the result on `photo.geocoded_*` and `photo_localized.*` for the operator's extra languages.
4. **(Optional) operator enrichment via JSON sidecar.** Drop a `<name>.json` alongside (or anywhere under) `inbox/` with the fields you want to overlay onto an existing row — title, description, operator-set country / place, etc. The converter matches it back to the row by id / originalFilename + timestamp and applies the overlay. The sidecar is archived under `photos/original/<id>.intake.json` after processing.
5. **(Optional) operator enrichment via CLI.** For one-off corrections, `./bin/photo.ts update <id> --title "…" --place "…"` applies the same overrides directly. `./bin/photo.ts show <id>` prints the current row; `./bin/photo.ts delete <id>` removes one. See `./bin/photo.ts --help`.

## Roadmap

Active milestones on the way to 1.0, plus the far-out 2.0 direction. Each bullet links the GitHub milestone for live status.

- [**0.15 — Composition + scale**](https://github.com/vlumi/photo-diary/milestone/15): the larger architectural shifts. Hybrid galleries (#22), DB drivers beyond SQLite (#265), saved filters / sub-galleries (#285), server-side stats with language-agnostic values and a single-key base cache (#286), content localization for photo metadata (#281), per-language editing for place / title / description (#343), stats category evolution over time (#383), year view full Jan–Dec on wide screens (#399), per-view fetch + server-side filtering (#406), retire the dummy DB driver in favour of real `:memory:` sqlite (#434), Galleries section composes with the Filters sidebar (#446).
- [**1.0 — Pre-release audits**](https://github.com/vlumi/photo-diary/milestone/4): test-coverage gap analysis (#194), frontend security audit (#217), end-to-end UI test suite (#261), documentation overhaul (#283), `bin/photo.ts` subcommand-surface tidy (#376).
- [**2.0 — Thin server, cloud-native direction**](https://github.com/vlumi/photo-diary/milestone/18) *(direction-setting, far out)*: shape may change significantly. Originals leave the server and live client-side or in cold storage; the converter's sharp pipeline becomes a local uploader bundled from the admin UI; all DB ops route through the API (no direct backdoor); storage backends behind a vendor-agnostic interface so S3-compatible / CDN deployments are an option. Vision and sub-ticket breakdown in #469. Likely diverges from today's self-hosted-monolith shape enough that it may end up being a different product line.

## Backlog

Themes loosely held for later — full list lives as open issues without a milestone on [GitHub](https://github.com/vlumi/photo-diary/issues?q=is%3Aissue+is%3Aopen+no%3Amilestone).

- **Media delivery** — viewport-sized rendition selection, photo license metadata + gated original-bytes download.
- **Filter & navigation UX** — range filters for continuous variables (time, focal length, aperture), edit-in-place filter pills, map modal that survives month / year navigation.
- **Gallery shape** — alternative renderers for galleries that aren't calendar-shaped.
- **Localization & data** — Finnish exonyms policy, per-language subdivision-name dataset as a reusable resource beyond this app.
- **Admin convenience** — runtime-overridable instance defaults (`DEFAULT_GALLERY`, `DEFAULT_THEME`, beta feature toggles) editable from `/m/` without an `.env` round-trip.

## Version History

Photo Diary is the third structural take on a long-running personal photo-gallery side project. The first ([pod.vlumi.net](https://web.archive.org/web/20131208222413/http://pod.vlumi.net/), 2004) was a calendar-grid view with one photo per day — initially Perl/CGI, later rewritten in Ruby/eruby (.rhtml) on Apache. The second ([github.com/vlumi/gallery](https://github.com/vlumi/gallery), 2012) stayed on the Ruby/eruby + Apache base, with SQLite for metadata, jQuery + Colorbox for the photo lightbox, Hammer.js for touch gestures, and a `bin/admin.rb` CLI for ingest (RMagick + exifr for thumbnailing and EXIF). It introduced multi-gallery support (one photo can belong to many galleries, virtual-host → gallery mapping), schema versioning, and per-gallery statistics — most of the conceptual surface Photo Diary still has.

Major release themes follow — see [CHANGELOG.md](CHANGELOG.md) for per-version detail.

### 2020 — foundations

Initial release and rapid follow-ups that established the core gallery, auth/ACL, map, stats, and filter model. The shape the app still has today was laid down here.

- **0.1** (Jul 2020) — Initial release. Read-only calendar views (year/month/day/photo), separate front-end and back-end API, abstract DAO layer.
- **0.2** (Jul 2020) — New SQLite schema with auth/ACL, embedded map with markers, EN/FI/JP localization, operator scripts for adding users/galleries/photos.
- **0.3** (Jul 2020) — Per-gallery statistics view; map markers chronologically connected; stats moved client-side.
- **0.4** (Aug 2020) — Photo property filters across gallery + stats. Migrated to styled-components, broader unit-test coverage.

### 2021–2022 — maintenance

A versioned API surface, instance-level metadata, and dependency catch-ups. Then a long pause.

- **0.5** (Dec 2021) — `/api/v1` versioned API, instance metadata table, CDN-aware photo URL, gallery list with name/description from meta.
- **0.5.1** (May 2022) — Aspect-ratio stats, react-scripts 5.

### 2026 — modernization & multi-instance

After the hiatus, a burst of releases that modernized the stack, formalized the multi-instance deploy story, and tightened privacy and security.

- **0.6** (May 2026) — Modernization sweep: Express 5, Node 26, ESM + TypeScript everywhere, better-sqlite3, React 19, Vite. Stats page gains a map with marker clustering; converter moves from ImageMagick to sharp.
- **0.7** (May 2026) — Multi-instance deploy pattern: versioned code under `/opt/`, per-instance dirs under `/var/`, atomic upgrades via `code`-symlink flip. Privacy `hide_map` cascade, helmet + login rate limit, npm workspaces.
- **0.8** (May 2026) — Backend framework swap to Fastify + TypeBox + OpenAPI / Swagger UI + typed error hierarchy. Frontend adopts `openapi-fetch`, TanStack Query, Zustand, and code-splits Stats + Photo out of the main bundle.
- **0.9** (May 2026) — Privacy hardening (collapsed 403/404 distinctions), JWT expiration, self-service password change, global 401 → login-modal handling, toast notifications, profile-icon UserMenu.
- **0.10** (May 2026) — UI/UX polish across the calendar and Stats views: photo modal with touch-tracking swipe + controlled zoom, Stats Location card with map-in-modal, clickable title-bar breadcrumb with gallery/stats segmented control, Day merged into Month, seven new themes, server-side logout via refresh-token sessions.
- **0.11** (May 2026) — Reverse-geocoded place hierarchy: converter intake fetches structured Nominatim data, a backfill daemon fills the historical archive, and audit surfaces operator-vs-geocoded drift. Converter hardens around filename collisions and stub flows; operator scripts gain `audit` subcommands and a `bin/meta.ts`.
- **0.12** (May 2026) — Geocoded location surfaces across the app: per-language city / state / country in the MetadataPanel, City + State filter categories, Stats Places + State topics, per-language city overlay JSON. Converter intake flows JSON sidecars + recursive subdirs. Beta-gated 35mm-equivalent focal length.
- **0.13** (Jun 2026) — Admin frontend bundle. Full `/m/*` surface — dashboard, Photos grid with faceted filters + edit drawer + multi-select bulk actions + audit chips, Galleries CRUD, Users + Groups + Access pages — behind `user.is_admin`. Stats splits into `/s/` with a global stats page. Mutation API hardens with TypeBox-validated bodies + field-locked overrides; virtual-host scope narrows reads + writes to a bound gallery; ACL gains user groups. Theme picker becomes a swatch grid with six new built-in themes.
- **0.14** (Jun 2026) — Admin UI polish. Slug-shaped ids, mutable `user.name` + renamed `group.name`, per-photo bulk Edit-fields modal, bulk Regeocode, dashboard audit-count tiles, filter-sidebar timeline strip with shift-range month picking, gallery-icon cropper, Inbox surface revamp, gallery-editor tier, `xx` sentinel for international waters. Mobile / small-screen pass: scrollable tables, dual pagers with 44px touch targets, Access table redesign, frosted-glass floating `BulkActions` bar, long-press + drag-to-range touch multi-select with edge auto-scroll.

See the [Roadmap](#roadmap) for what's in flight after 0.14.
  