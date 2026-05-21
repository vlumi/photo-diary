# Photo Diary

**Photo Diary** is a calendar-based photo gallery platform for self-hosting. The photos are arranged by the date they were shot, in calendar-based views, aimed at diaries and other, date-based photography projects.

Key features include:

- Calendar-based views (year, month, day, photo)
  - Including map from embedded GPS information
- Comprehensive photo statistics (time, gear, exposure settings, etc.)
- Fast browsing – gallery content (apart from actual photos) loaded once at startup
- User management and basic access control

## Structure

Photo Diary is split into separate independent modules, each handling its own sub-system:

- [react-app](react-app) – Front-end web app
- [server](server) – Back-end API
- [converter](converter) – Back-end process for pre-processing new photos to be added to the gallery

### Basic Setup

- Requires Node.js 22 or newer; npm 10+ recommended (npm workspaces)
- From the repo root, run `npm run setup` — installs every workspace ([server](server), [converter](converter), [react-app](react-app)) and builds the frontend into [server](server)/`build/` for production
- Create a photo-repository directory structure, separate from the code
  - Must include the sub-directories `inbox`, `original`, `display`, and `thumbnail`
  - The directory layout is fixed: the `photos/` subdirectory of the instance dir holds the photo repository, and the SQLite DB file lives at `<instance>/db.sqlite3`. Symlink the subdirectories (or the whole instance dir) if you need them on a different disk.
- Set `DB_DRIVER=sqlite3` in [server](server)/`.env`. The DB file is created at `<instance>/db.sqlite3` on first server start; the migration runner bootstraps the schema and applies any pending migrations on every start
- Start [server](server) and [converter](converter) as background processes, e.g. via [pm2](https://pm2.keymetrics.io/) — both use `npm run prod` which invokes `pm2 start --interpreter tsx`
- Seed the first user and at least one gallery via the operator scripts surfaced as `<instance>/bin/<name>` symlinks (created by `bin/instance`). E.g. `./bin/user -u alice -p ...` and `./bin/gallery --id dailybw --title "Daily B&W"`. To give the user admin access, insert an ACL row directly: `INSERT INTO acl (user_id, gallery_id, level) VALUES ('alice', ':all', 2)` (level 2 = admin, level 1 = view). See [server/README.md](server/README.md) for the management scripts and the access-control model in detail.
- Set the instance's `cdn` value (via `UPDATE meta SET value='https://photos.example.com/' WHERE key='instance_cdn'` or the `/api/v1/meta` API) to the public URL that serves `display/` and `thumbnail/` (typically the same nginx host). This overrides the frontend's `/` default at runtime — the bundle itself ships no per-instance config

### Dev Mode

Mirror the prod layout with a dev "instance" inside the repo. The init script wires it up the same way as a real deploy, but with the `code` symlink pointing at the live source:

```sh
./bin/instance dev --base .
```

That gives you `<repo>/dev/` with `.env`, `photos/{inbox,…,thumbnail}/`, `code → <repo>`. Each of server, converter, and react-app has a `bin/start-dev.sh` wrapper — run them in the foreground (tsx watch / vite, no pm2):

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
  0.7.0/                                #   each version unpacked into its own subdir
  0.8.0/                                #   so different instances can run different versions
                                        #   and upgrades are atomic (flip a symlink)

/var/photo-diary/
  dailybw/                              # one directory per instance
    .env                                # per-instance config (see below)
    code -> /opt/photo-diary/0.8.0      # symlink to the code version this instance runs
    db.sqlite3                          # auto-created on first server start
    photos/
      inbox/  original/  display/  thumbnail/
  travel/
    .env
    code -> /opt/photo-diary/0.7.0      # different instance, possibly on a different version
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
V=0.7.0
mkdir -p "/opt/photo-diary/$V"
curl -L "https://github.com/vlumi/photo-diary/archive/refs/tags/v$V.tar.gz" \
  | tar xz -C "/opt/photo-diary/$V" --strip-components=1
cd "/opt/photo-diary/$V"
npm run setup
```

Repeat this block for each new version you want to land on this host.

#### Bootstrapping a new instance

The `bin/instance` script handles directory creation, `.env` generation (with a fresh random `SECRET`), the `code` symlink, and the per-instance `bin/` shortcuts in one shot. Invoke it from the version of the code you want the instance to run:

```sh
/opt/photo-diary/0.7.0/bin/instance dailybw
```

That creates `/var/photo-diary/dailybw/` with everything wired up — including `/var/photo-diary/dailybw/bin/{instance,photo,gallery,user}` symlinks so the rest of the operator commands are short paths (`./bin/photo …` instead of `./code/server/bin/photo.ts …`). The script can be invoked from any working directory; the instance dir is derived from the name (and the `--base <dir>` flag, default `/var/photo-diary`, if you want instances under a different parent). Re-running on an existing instance acts as a doctor — verifies the directory tree, checks for missing required `.env` keys, reports `✓`/`✗`. Add `--fix` to append any missing keys with defaults (without touching existing values).

The generated `.env` covers the required keys. Optional per-instance frontend defaults can be added — these flow through `/api/v1/meta` to the frontend on boot:

```sh
DEFAULT_GALLERY=dailybw
DEFAULT_THEME=grayscale
```

#### Starting an instance

```sh
cd /var/photo-diary/dailybw
./code/server/bin/start-prod.sh
./code/converter/bin/start-prod.sh
```

Both `start-prod.sh` scripts source `.env` from the current working directory, then start pm2 with names derived from `INSTANCE_NAME` (`<name>` and `<name>-converter`). `pm2 save` after a successful start so they come back on reboot.

#### Upgrading an instance

Re-run `bin/instance` from the new version of the code:

```sh
pm2 stop dailybw dailybw-converter
/opt/photo-diary/0.8.0/bin/instance dailybw   # backs up the DB, flips the symlink
pm2 restart dailybw dailybw-converter         # migration runner applies any schema bumps
```

The DB backup is named `db.sqlite3.pre-<new-version>` — a plain file copy that assumes the instance is stopped (started instances may have an inconsistent backup). Rollback is manual: `cp db.sqlite3.pre-<version> db.sqlite3`, point `code` back at the older version, restart pm2.

nginx (one server block per instance, proxying to its `PORT`; the `cdn` URL serves `display/` and `thumbnail/` directly):

```nginx
server {
  server_name dailybw.example.com;
  location / { proxy_pass http://127.0.0.1:4201; }
  location /display/   { alias /var/photo-diary/dailybw/photos/display/; }
  location /thumbnail/ { alias /var/photo-diary/dailybw/photos/thumbnail/; }
}
```

Optional: a single instance can serve multiple vhosts that resolve to different galleries via the existing `gallery.hostname` regex column — set `hostname` to `^travel\.` on the travel gallery and add a corresponding server block proxying to the same instance.

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

The `bin/instance` upgrade flow already creates `db.sqlite3.pre-<version>` snapshots before flipping the `code` symlink — those are good restore points for a downgrade, but they're not a substitute for off-host backups.

**Common symptoms and where to look:**

| Symptom | First thing to check |
| --- | --- |
| Server won't start | `pm2 logs <name>` — most common: missing `SECRET` in `.env`, port already in use, or the migration runner threw on a DB inconsistency. |
| Converter logs "Invalid photo-repository directory structure" | The `photos/{inbox,original,display,thumbnail}/` subdirs aren't all present — re-run `./bin/instance <name>` (or `bin/instance <name>` from the code root) to recreate any missing ones (idempotent). |
| `no such table: …` after upgrade | A migration didn't apply. Check `sqlite3 db.sqlite3 "SELECT value FROM meta WHERE key='schema_version'"` and the server log on startup for "Applying N DB migration(s)". |
| Frontend loads but `/api/v1/galleries` 401s | The user's token expired or the `SECRET` changed across restarts — login again. |
| Map widget missing where you expected it | The `hide_map` ACL cascade is hiding it; check `SELECT * FROM acl WHERE hide_map IS NOT NULL` and the privacy doc in the server README. |

## Features

- Photos are segmented into galleries
  - Each photo can be in any number of galleries
  - Single level – no nesting
  - One gallery view at a time
  - Special galleries for more abstract concepts
    - :all includes all photos
    - :public includes all photos added to galleries
    - :private includes photos not added to any galleries
  - Hostname-based default gallery selection
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
- Admin view (TBD)
  - Add new photos
    - Pick up from upload directory on the server
    - Metadata extraction from EXIF
      - Timestamp
      - Exposure values
      - Camera/lens
    - Manual input
      - Galleries to link
      - Author
      - Country
      - Override any automatically extracted values
    - Create thumbnail and display size photos
  - Update photo properties
    - Update photo metadata
    - If original file is still found
      - Metadata extraction from EXIF
      - Create thumbnail and display size photos
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

## Photo Pipeline

End-to-end flow from a new JPG arriving on the host to it being browsable in the gallery:

1. **Drop into `inbox/`.** Copy/move a JPG (or other supported format) into the instance's `photos/inbox/` directory. The converter watches this path (via chokidar) and picks the file up immediately.
2. **Converter processes the file.** [converter](converter) reads the EXIF, generates display- and thumbnail-sized renditions (via sharp), and writes them to `photos/display/<name>.jpg` and `photos/thumbnail/<name>.jpg`. The extracted EXIF lands as a sibling JSON in `photos/inbox/<name>.json`. The original JPG is moved to `photos/original/<name>.jpg`. Result: the photo is on disk in three sizes, plus a JSON metadata file ready for ingestion.
3. **Register in the DB.** Run `./bin/photo photos/inbox/*.json --gallery <id>` from the instance dir. This reads each JSON, inserts a `photo` row with all the extracted EXIF (timestamp, camera, lens, geo, dimensions), and links the photo to the named gallery(ies) via `gallery_photo`. After this step the photo appears in the gallery on next page load.
4. **(Optional) clean up.** The `inbox/*.json` files have served their purpose once ingested. They're harmless to leave but you can move/delete them to keep the inbox tidy.

The pipeline is intentionally split: the converter doesn't touch the DB at all, and the server doesn't read from the inbox. That lets you bulk-process a backlog of photos with the converter, eyeball the JSON sidecars, and then register them in batches via `./bin/photo` with overrides applied if needed (e.g. `--country jp --place "Yokohama, Kanagawa"` for a whole trip).

`./bin/photo` also accepts JPG paths directly instead of JSON: in that mode it registers a bare `photo` row with no EXIF data (just the filename as the ID), useful when the metadata isn't worth recovering.

## Roadmap

Features planned for a 1.0 release.

- Front-end
  - Global admin view
    - Manage users & ACL
    - Manage galleries
    - Manage photos
    - Manage gallery/photo linking
- Back-end
  - Fully tested Modification API
    - User
    - ACL
    - Gallery
    - Photo
    - Gallery-photo linking
- Hybrid galleries
  - Combine galleries to form new galleries
  - Apply filters to an existing gallery

## Backlog

These features would be nice to have, but are too far into the future to put on the roadmap.

- Front-end
  - Gallery view
    - Multiple display sizes, dynamically chosen to match client window size
    - Photo license information
      - Permit/deny original size download by users
  - Gallery admin view (TBD)
    - Manage authorized galleries
    - Manage photos linked to only authorized galleries
    - Manage gallery/photo linking
  - Photo property filter improvements
    - Range filters for continuous variables: time, exposure values
    - Coordinate filter, within a radius
- Back-end
  - Drivers for different DBs; PostgreSQL, MySQL/MariaDB, MongoDB, ...

## [Version History](CHANGELOG.md)
