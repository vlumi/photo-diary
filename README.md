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
  - Set `PHOTO_ROOT_DIR` in [server](server)/`.env` and [converter](converter)/`.env` to point to this directory
- Set `DB_DRIVER=sqlite3` and `DB_OPTS=/path/to/dailybw.sqlite3` (or any other filename) in [server](server)/`.env`. The schema is bootstrapped automatically on first server start; subsequent starts apply any pending migrations
- Start [server](server) and [converter](converter) as background processes, e.g. via [pm2](https://pm2.keymetrics.io/) — both use `npm run prod` which invokes `pm2 start --interpreter tsx`
- Seed the first admin user and at least one gallery with the management scripts in [server/bin/](server/bin/), e.g. `./bin/add-user.ts --admin -u alice -p ...` and `./bin/add-gallery.ts -i dailybw -t "Daily B&W"`
- Set the instance's `cdn` value (via `UPDATE meta SET value='https://photos.example.com/' WHERE key='instance_cdn'` or the `/api/v1/meta` API) to the public URL that serves `display/` and `thumbnail/` (typically the same nginx host). This overrides the frontend's `/` default at runtime — the bundle itself ships no per-instance config

### Multi-Instance Deployment

One VM can host several Photo Diary instances under a single nginx, each pointing at its own code-clone via a `code` symlink in the instance directory. The frontend has no build-time per-instance config, so a single `npm run setup` per code checkout (run once when the checkout is created) covers every instance using that checkout.

Directory layout:

```text
/opt/photo-diary/                       # parent dir, owned by the deploy user (see below)
  0.6.0/                                #   each version unpacked into its own subdir
  0.7.0/                                #   so different instances can run different versions
                                        #   and upgrades are atomic (flip a symlink)

/var/photo-diary/
  dailybw/                              # one directory per instance
    .env                                # per-instance config (see below)
    code -> /opt/photo-diary/0.7.0      # symlink to the code version this instance runs
    dailybw.sqlite3                     # auto-created on first server start
    photos/
      inbox/  original/  display/  thumbnail/
  travel/
    .env
    code -> /opt/photo-diary/0.6.0      # different instance, possibly on a different version
    travel.sqlite3
    photos/
      …
```

Single-version setups can drop the version subdirectory (`/opt/photo-diary/` for the code, `code -> /opt/photo-diary` per instance).

#### Getting the code onto the host

GitHub auto-generates a source tarball for every tag. Extract it directly into a version subdirectory of `/opt/photo-diary/` with `tar --strip-components=1` so there's no rename step:

```sh
# One-time host prep: make the parent dir, owned by the deploy user
sudo install -d -o "$USER" /opt/photo-diary

# Per-version unpack
V=0.7.0
mkdir -p "/opt/photo-diary/$V"
curl -L "https://github.com/vlumi/photo-diary/archive/refs/tags/v$V.tar.gz" \
  | tar xz -C "/opt/photo-diary/$V" --strip-components=1

# Install everything + build the bundled frontend
cd "/opt/photo-diary/$V"
npm run setup
```

#### Bootstrapping a new instance

The `init-instance` script handles directory creation, `.env` generation (with a fresh random `SECRET`), and the `code` symlink in one shot. Invoke it from the version of the code you want the instance to run:

```sh
/opt/photo-diary/0.7.0/server/bin/init-instance.ts dailybw
```

That creates `/var/photo-diary/dailybw/` with everything wired up. Re-running on an existing instance acts as a doctor — verifies the directory tree, checks for missing required `.env` keys, reports `✓`/`✗`. Add `--fix` to append any missing keys with defaults (without touching existing values).

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

Re-run `init-instance.ts` from the new version of the code:

```sh
pm2 stop dailybw dailybw-converter
/opt/photo-diary/0.7.0/server/bin/init-instance.ts dailybw   # backs up the DB, flips the symlink
pm2 restart dailybw dailybw-converter                         # migration runner applies any schema bumps
```

The DB backup is named `<dbname>.sqlite3.pre-<new-version>` — a plain file copy that assumes the instance is stopped (started instances may have an inconsistent backup). Rollback is manual: `cp <dbname>.sqlite3.pre-<version> <dbname>.sqlite3`, point `code` back at the older version, restart pm2.

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
