# Setup

Operator guide for installing and running Photo Diary. The project's overview, features, and history live in [README.md](README.md); this file is about getting an instance up and keeping it running.

- [Basic setup](#basic-setup)
- [Dev mode](#dev-mode)
- [Multi-instance deployment](#multi-instance-deployment)
  - [Host prep](#one-time-host-prep)
  - [Getting the code](#getting-the-code-onto-the-host)
  - [Bootstrap](#bootstrapping-a-new-instance)
  - [Start](#starting-an-instance)
  - [Upgrade](#upgrading-an-instance)
  - [nginx](#nginx)
  - [Per-gallery vhost](#per-gallery-vhost-mapping)
  - [Day-to-day ops](#operating-an-instance)

## Basic Setup

Quickstart for a single personal instance. For the full production layout (multi-version code under `/opt/`, per-instance dirs under `/var/`, nginx vhosts, atomic upgrades, backup) see [Multi-Instance Deployment](#multi-instance-deployment) below; for an in-repo dev setup without an instance dir at all, see [Dev Mode](#dev-mode).

1. **Prerequisites + install.** Node.js 22 or newer (npm 10+ recommended for workspaces) and [pm2](https://pm2.keymetrics.io/) installed globally (`npm install -g pm2`) — the per-instance `start-prod.sh` scripts and the `bin/instance.ts` upgrade / `--cycle` flows shell out to it. From the repo root, `npm run setup` installs every workspace ([server](server), [converter](converter), [react-app](react-app)) and builds the frontend into [server](server)/`build/`.
2. **Bootstrap the instance directory** with [`bin/instance.ts`](bin/instance.ts). It creates the dir tree (`photos/{inbox,original,thumbnail}/` — rendition directories like `photos/display/` are added by the converter on first intake), generates `.env` with a fresh random `SECRET`, links `code` to this checkout, and surfaces operator shortcuts at `<instance>/bin/{photo,photo-rename,photo-geocode,photo-rerender,gallery,user,group,meta}.ts`. The positional is the instance directory (relative or absolute):

   ```sh
   ./bin/instance.ts /var/photo-diary/<name>     # production layout
   ./bin/instance.ts ~/photo-diary/<name>        # personal layout — any path works
   ```

   Pass `--name <label>` to pin a logical name different from the dir basename (writes through to `.env`'s `INSTANCE_NAME`, which the pm2 process labels use). See [Bootstrapping a new instance](#bootstrapping-a-new-instance) for the dir layout, `.env` keys, and re-run-as-doctor semantics.
3. **Start the processes** via the per-instance `start-prod.sh` scripts (pm2-managed; the DB file is created at `<instance>/db.sqlite3` on first start and the migration runner bootstraps the schema on every start):

   ```sh
   cd <parent-dir>/<name>
   ./code/server/bin/start-prod.sh
   ./code/converter/bin/start-prod.sh
   ```

4. **Seed the first user, gallery, and admin grant** via the per-instance operator shortcuts. See [server/README.md](server/README.md) for the full management toolkit and the access-control model:

   ```sh
   ./bin/user.ts passwd <user> <password>
   ./bin/user.ts make-admin <user>
   ./bin/gallery.ts <gallery-id> --title "<Title>"
   ```

5. **Set the instance `cdn`** — the public URL that serves `display/`, `thumbnail/`, and `gallery-icons/`, typically the same nginx host:

   ```sh
   ./bin/meta.ts set instance_cdn https://photos.example.com/
   ```

   This overrides the frontend's `/` default at runtime; the bundle itself ships no per-instance config. The same value can also be set via the `/api/v1/meta` API or `UPDATE meta SET value='…' WHERE key='instance_cdn'` directly if the operator script isn't reachable.

## Dev Mode

Mirror the prod layout with a dev "instance" inside the repo. The init script wires it up the same way as a real deploy, but with the `code` symlink pointing at the live source:

```sh
./bin/instance.ts dev
```

That gives you `<repo>/dev/` with `.env`, `photos/{inbox,original,thumbnail}/`, `code → <repo>` (the `dev/` path is gitignored, so the bootstrapped state won't pollute the repo). Each of server, converter, and react-app has a `bin/start-dev.sh` wrapper — run them in the foreground (tsx watch / vite, no pm2):

```sh
cd dev
./code/server/bin/start-dev.sh        # terminal 1
./code/converter/bin/start-dev.sh     # terminal 2
./code/react-app/bin/start-dev.sh     # terminal 3 (vite dev server, proxies /api/* to localhost:4200)
```

If you don't need photos in dev, you can also just `cd server && npm run dev` — the DB will land at `server/db.sqlite3` and you skip the instance-dir ceremony entirely.

## Multi-Instance Deployment

One VM can host several Photo Diary instances under a single nginx, each pointing at its own code-clone via a `code` symlink in the instance directory. The frontend has no build-time per-instance config, so a single `npm run setup` per code checkout (run once when the checkout is created) covers every instance using that checkout.

Directory layout:

```text
/opt/photo-diary/                       # parent dir, owned by the deploy user (see below)
  0.11.0/                               #   each version unpacked into its own subdir
  0.17.0/                               #   so different instances can run different versions
                                        #   and upgrades are atomic (flip a symlink)

/var/photo-diary/
  dailybw/                              # one directory per instance
    .env                                # per-instance config (see below)
    code -> /opt/photo-diary/0.17.0      # symlink to the code version this instance runs
    db.sqlite3                          # auto-created on first server start
    photos/
      inbox/  original/  thumbnail/        # display/<maxDim>/ subdirs auto-created on intake
  travel/
    .env
    code -> /opt/photo-diary/0.11.0     # different instance, possibly on a different version
    db.sqlite3
    photos/
      …
```

Single-version setups can drop the version subdirectory (`/opt/photo-diary/` for the code, `code -> /opt/photo-diary` per instance).

### One-time host prep

Create the two parent directories (code at `/opt`, per-instance state at `/var`) owned by the deploy user, so subsequent steps don't need `sudo`:

```sh
sudo install -d -o "$USER" /opt/photo-diary /var/photo-diary
```

### Getting the code onto the host

GitHub auto-generates a source tarball for every tag. Extract it directly into a version subdirectory of `/opt/photo-diary/` with `tar --strip-components=1` (no rename step), then run `npm run setup` to install everything and build the bundled frontend:

```sh
V=0.17.0
mkdir -p "/opt/photo-diary/$V"
curl -L "https://github.com/vlumi/photo-diary/archive/refs/tags/v$V.tar.gz" \
  | tar xz -C "/opt/photo-diary/$V" --strip-components=1
cd "/opt/photo-diary/$V"
npm run setup
```

Repeat this block for each new version you want to land on this host.

### Bootstrapping a new instance

The `bin/instance.ts` script handles directory creation, `.env` generation (with a fresh random `SECRET`), the `code` symlink, and the per-instance `bin/` shortcuts in one shot. Invoke it from the version of the code you want the instance to run:

```sh
/opt/photo-diary/0.17.0/bin/instance.ts /var/photo-diary/dailybw
```

That creates `/var/photo-diary/dailybw/` with everything wired up — including `/var/photo-diary/dailybw/bin/{photo,gallery,user}.ts` symlinks so the routine operator commands are short paths (`./bin/photo.ts …` instead of `./code/server/bin/photo.ts …`). The positional is the instance directory; it's resolved via `path.resolve()` against cwd, so `dailybw` and `./dailybw` both mean `<cwd>/dailybw`, while `../sibling` and absolute paths resolve as expected. To pin a logical name different from the dir basename, pass `--name`. Re-running on an existing instance acts as a doctor — verifies the directory tree, checks for missing required `.env` keys, reports `✓`/`✗`. Add `--fix` to append any missing keys with defaults (without touching existing values).

The generated `.env` covers the required keys. Optional per-instance frontend defaults can be added — these flow through `/api/v1/meta` to the frontend on boot:

```sh
DEFAULT_GALLERY=dailybw
DEFAULT_THEME=grayscale
DEFAULT_LANGUAGE=fi         # operator's primary; falls back to `en` if missing
BETA_FEATURE_REGIONS=user   # `user` (default) | `on` | `off`
```

`BETA_FEATURE_<NAME>` locks a beta feature for this instance: `on` enables it for everyone (hides the per-browser toggle), `off` disables it for everyone, `user` (default) shows the toggle in the UserMenu so each visitor can opt in. See the [server README](server/README.md#environment-variables) for the full env table.

### Starting an instance

```sh
cd /var/photo-diary/dailybw
./code/server/bin/start-prod.sh
./code/converter/bin/start-prod.sh
```

Both `start-prod.sh` scripts source `.env` from the current working directory, then start pm2 with names derived from `INSTANCE_NAME` (`<name>` and `<name>-converter`). `pm2 save` after a successful start so they come back on reboot.

### Upgrading an instance

Re-run `bin/instance.ts` from the new version of the code, then **delete + start** pm2 (not `restart`):

```sh
pm2 stop dailybw dailybw-converter
/opt/photo-diary/0.17.0/bin/instance.ts /var/photo-diary/dailybw    # backs up the DB, flips the symlink
pm2 delete dailybw dailybw-converter                                # drop cached metadata
cd /var/photo-diary/dailybw
./code/server/bin/start-prod.sh                                     # migration runner applies any schema bumps
./code/converter/bin/start-prod.sh
pm2 save
```

`pm2 restart` won't pick up the symlink flip — pm2 caches the resolved script path and the package.json version at the original `start` time, so a restart re-execs the *old* paths and `pm2 list` keeps showing the previous version. `delete` + `start-prod.sh` forces re-resolution and is the only reliable upgrade path today.

The DB backup is named `db.sqlite3.pre-<new-version>` — a plain file copy that assumes the instance is stopped (started instances may have an inconsistent backup). Rollback is manual: `cp db.sqlite3.pre-<version> db.sqlite3`, point `code` back at the older version, then the same `pm2 delete && start-prod.sh` cycle.

### nginx

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

  # Photo bytes — served directly from disk. The IDs are content-stable
  # (the converter writes by EXIF-derived ID), so we can mark these
  # immutable. `/display/` covers every configured rendition size at
  # once (each size lives at `display/<maxDim>/<id>.jpg`); adding a
  # size to the `renditions` meta key never requires an nginx edit.
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

### Per-gallery vhost mapping

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

### Operating an instance

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
- `<instance>/photos/{original,display,thumbnail}/` — the bytes themselves (`display/` is `display/<maxDim>/<id>.jpg` per configured rendition size). `inbox/` is transient (the converter empties it), no need to back it up.

The `bin/instance.ts` upgrade flow already creates `db.sqlite3.pre-<version>` snapshots before flipping the `code` symlink — those are good restore points for a downgrade, but they're not a substitute for off-host backups.

**Common symptoms and where to look:**

| Symptom | First thing to check |
| --- | --- |
| Server won't start | `pm2 logs <name>` — most common: missing `SECRET` in `.env`, port already in use, or the migration runner threw on a DB inconsistency. |
| Converter logs "Invalid photo-repository directory structure" | The `photos/{inbox,original,thumbnail}/` subdirs aren't all present — re-run `./bin/instance.ts <name>` (or `bin/instance.ts <name>` from the code root) to recreate any missing ones (idempotent). Rendition directories like `display/` are auto-created by the converter on first intake and don't need to pre-exist. |
| `no such table: …` after upgrade | A migration didn't apply. Check `sqlite3 db.sqlite3 "SELECT value FROM meta WHERE key='schema_version'"` and the server log on startup for "Applying N DB migration(s)". |
| Frontend loads but `/api/v1/galleries` 401s | The user's token expired or the `SECRET` changed across restarts — login again. |
| Map widget missing where you expected it | The `hide_map` cascade is hiding it; inspect a user's resolved grants with `./bin/user.ts access <user>` and see the privacy doc in the server README. |
