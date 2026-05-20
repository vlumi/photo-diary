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

- Requires Node.js 22 or newer; npm 10+ recommended
- Run `npm install` in [server](server), [converter](converter), and [react-app](react-app)
- Create a photo-repository directory structure, separate from the code
  - Must include the sub-directories `inbox`, `original`, `display`, and `thumbnail`
  - Set `PHOTO_ROOT_DIR` in [server](server)/`.env` and [converter](converter)/`.env` to point to this directory
- Set `DB_DRIVER=sqlite3` and `DB_OPTS=/path/to/dailybw.sqlite3` (or any other filename) in [server](server)/`.env`. The schema is bootstrapped automatically on first server start; subsequent starts apply any pending migrations
- Build the [react-app](react-app) into [server](server) for production, running in the [server](server) directory:
  - `npm run build:ui`
- Start [server](server) and [converter](converter) as background processes, e.g. via [pm2](https://pm2.keymetrics.io/) — both use `npm run prod` which invokes `pm2 start --interpreter tsx`
- Seed the first admin user and at least one gallery with the management scripts in [server/bin/](server/bin/), e.g. `./bin/add-user.ts --admin -u alice -p ...` and `./bin/add-gallery.ts -i dailybw -t "Daily B&W"`
- Set the instance's `cdn` value (via `UPDATE meta SET value='https://photos.example.com/' WHERE key='instance_cdn'` or the `/api/v1/meta` API) to the public URL that serves `display/` and `thumbnail/` (typically the same nginx host). This overrides the frontend's `/` default at runtime — the bundle itself ships no per-instance config

### Multi-Instance Deployment

One VM running several Photo Diary instances under a single nginx, sharing one code clone. The frontend has no build-time per-instance config, so a single `npm run build:ui` covers every instance.

Directory layout:

```text
/opt/photo-diary/                       # one shared code checkout — `git pull` updates all instances
  server/         converter/         react-app/
/var/photo-diary/
  dailybw/                              # one directory per instance
    .env                                # per-instance config (see below)
    dailybw.sqlite3                     # auto-created on first server start
    photos/
      inbox/  original/  display/  thumbnail/
  travel/
    .env
    travel.sqlite3
    photos/
      …
```

Per-instance `.env` (lives in the instance directory, **not** in the code checkout):

```sh
INSTANCE_NAME=dailybw                    # pm2 process name; converter gets `<name>-converter`
PORT=4201                                # one per instance, nginx-proxied
SECRET=…                                 # unique per instance
DB_DRIVER=sqlite3
DB_OPTS=/var/photo-diary/dailybw/dailybw.sqlite3
PHOTO_ROOT_DIR=/var/photo-diary/dailybw/photos

# Optional per-instance frontend defaults — these go through /api/v1/meta:
DEFAULT_GALLERY=dailybw
DEFAULT_THEME=grayscale
```

Starting an instance (server + converter):

```sh
cd /var/photo-diary/dailybw
npm --prefix /opt/photo-diary/server run prod
npm --prefix /opt/photo-diary/converter run prod
```

The `prod` script reads the instance directory's `.env`, names the pm2 process after `INSTANCE_NAME` (server) and `${INSTANCE_NAME}-converter` (converter), and starts both pointing at the right paths. `pm2 save` after a successful start so they come back on reboot.

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
