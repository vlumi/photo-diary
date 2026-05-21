# Photo Diary Server

This server implements the RESTful API of the Photo Diary

## Requirements

- [Node.js](https://nodejs.org) 22 or newer; npm 10+ recommended
- Dependencies (see `package.json` for the full list)
  - [Express](https://expressjs.com/) 5
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
| `SECRET` | ✓ | — | HMAC secret used to sign JWT tokens. The server refuses to start without it. Keep stable per instance; rotating invalidates every existing session. |
| `DB_DRIVER` | ✓ | — | `sqlite3` (production) or `dummy` (test fixture). |
| `PORT` | | `4200` | HTTP port nginx proxies to. One per instance. |
| `INSTANCE_NAME` | | `photo-diary-server` | pm2 process name when launched via `bin/start-prod.sh`. The converter half is automatically suffixed `-converter`. |
| `NODE_ENV` | | `prod` | `dev` / `prod` / `test`. Set by the npm scripts; don't override unless you know why. |
| `DEBUG` | | `false` | When truthy, enables verbose logger output. |
| `STATIC_DIR` | | `<source>/build` | Path to the bundled frontend. Resolved relative to the server's source file by default; override if you build into a non-standard location. |
| `DEFAULT_GALLERY`, `DEFAULT_THEME`, `INITIAL_GALLERY_VIEW`, `FIRST_WEEKDAY` | | — | Per-instance frontend defaults, surfaced through `/api/v1/meta` to the frontend on boot. See the top-level README's Multi-Instance section. |

The SQLite DB file and the photo repository are **not** configured via env vars — they're fixed-by-convention at `<cwd>/db.sqlite3` and `<cwd>/photos/` respectively. See the next subsection.

### Fixed-by-convention paths

The SQLite DB file and the photo repository are no longer configurable via env vars — they live at fixed locations relative to the server's working directory (which is the **instance directory** when launched via `start-prod.sh`):

- **`<cwd>/db.sqlite3`** – the SQLite DB. If absent at first start, better-sqlite3 creates the file and the migration runner bootstraps the schema from `db/sqlite3/migrations/001_baseline.sql`. Subsequent starts apply any pending migrations from the same directory in version order, using the `meta.schema_version` row as the cursor. New migrations: drop `NNN_<description>.sql` (with a higher number than the last one) and end the file with `UPDATE meta SET value='NNN' WHERE key='schema_version';`.
- **`<cwd>/photos/`** – the photo repository. Must contain the sub-directories `inbox`, `original`, `display`, `thumbnail`. Created automatically by `<repo-root>/bin/instance.ts`.

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

The per-instance `bin/` directory (`<instance>/bin/{photo,gallery,user}.ts`) is populated by `bin/instance.ts` on init and refreshed on doctor / upgrade runs — each is a symlink into `<instance>/code/server/bin/`. `instance.ts` itself is deliberately not shortcut-symlinked here: bootstrap / upgrade always wants the specific code version (`/opt/photo-diary/<version>/bin/instance.ts <name>`), and the doctor re-run is rare enough that `./code/bin/instance.ts <name> --base <parent>` is fine. The `.ts` extension is kept on the symlinks (rather than bare names) so editors recognise them as TS source and apply the server's tsconfig via realpath.

#### `instance.ts <name> [--base <dir>] [--fix]`

Bootstrap, doctor, or upgrade a Photo Diary instance directory in one command. Default base is `/var/photo-diary`. Mode is auto-detected from existing state:

- **New** — creates the directory tree, generates `.env` with a fresh random `SECRET`, creates a `code` symlink pointing at this script's own code root, and creates the per-instance `bin/{photo,gallery,user}.ts` shortcuts.
- **Doctor** — instance exists, `code` already points at this script's root. Reports missing `.env` keys with `✓`/`✗` markers. Refreshes any missing `bin/` shortcuts. Add `--fix` to append defaults to `.env`.
- **Upgrade** — `code` points at a different version. Backs up the DB to `db.sqlite3.pre-<new-version>` and flips the symlink. Refreshes `bin/` shortcuts.

#### `user.ts [options]`

Three mutually-exclusive modes, picked by which flags you pass:

| Flag | Purpose |
| --- | --- |
| `-l`, `--list` | Print every user as a table with their admin flag (derived from a `(user, ':all', admin)` row in `user_gallery`). |
| `-u <id>`, `--user <id>` plus `-p <pw>`, `--password <pw>` | Upsert: creates if missing, updates the password if present. Pair with `--keep-secret` to preserve existing JWT sessions; the default rotates the secret, killing every active session (correct for "password lost / leaked"). |
| `-d <id>`, `--delete <id>` | Delete the user and cascade their `user_gallery` rows (access + hide_map). Asks for confirmation unless `-y`/`--yes` is given. |

Access level changes are handled by [`access.ts`](#accessts-subcommand-) — `user.ts` doesn't touch the `user_gallery` table except to cascade-delete on `--delete`.

#### `access.ts <subcommand> …`

Manages rows in the `user_gallery` table — access level (view / admin) and the `hide_map` privacy toggle. Replaces the previous "edit the DB directly with sqlite3" recipes. `:guest` (the sentinel user) and `:all` (the sentinel gallery) are accepted directly as positional arguments.

| Subcommand | Purpose |
| --- | --- |
| `list [--user <id>] [--gallery <id>]` | Print existing rows as a table. Optional filters narrow to one user, one gallery, or both. |
| `level <user> <gallery> <none\|view\|admin>` | Set the access level on a row (upserts). `none` is the row-level deny — the cascade stops here. Preserves any existing `hide_map` value on the same pair. |
| `unset <user> <gallery> [--yes]` | Delete the row entirely so the cascade falls through to less-specific rows. Asks for confirmation unless `--yes` is given. |
| `hide-map <user> <gallery> <hide\|show\|default>` | Set or clear the privacy toggle. `default` clears the override so the cascade falls through to a less-specific row. |

`level … none` and `unset` are not the same: `level … none` writes a row with `access_level=0` and stops the cascade at that row (explicit deny at this level); `unset` deletes the row entirely and lets the cascade fall through to less-specific rows.

Examples:

```sh
./bin/access.ts level alice :all admin            # alice gets admin everywhere
./bin/access.ts level :guest :all view            # public visitors can view everything
./bin/access.ts level alice secret none           # block alice from "secret" even if :all grants view
./bin/access.ts hide-map :guest dailybw hide      # hide map for guests on one gallery
./bin/access.ts hide-map alice dailybw default    # clear alice's override on that gallery
./bin/access.ts list --user alice                 # show alice's rows
./bin/access.ts unset alice travel                # delete the row (with confirmation)
```

The cascade resolution lives in [server/lib/privacy.ts](lib/privacy.ts) and `loadUserAccessControl` in [server/db/sqlite3/index.ts](db/sqlite3/index.ts) — privacy-only rows (those with `access_level=NULL`) are filtered out of the access map so they don't break access fall-through to `:all`.

#### `gallery.ts [options]`

Creates or updates a single gallery row. Always requires `--id`.

| Flag | Purpose |
| --- | --- |
| `--id <id>` | Gallery ID (required; used in URLs and ACL references). |
| `--title <s>` | Display title. |
| `--description <s>` | Long description shown on the gallery list page. |
| `--epoch <YYYY-MM-DD>` | Anchor date for the gallery (e.g. a birthday for a "day in the life" project). |
| `--epoch_type <type>` | One of the supported epoch types — see [models/GalleryModel.ts](../react-app/src/models/GalleryModel.ts). |
| `--theme <name>` | One of `blue`, `red`, `grayscale`, `bw`, `alert` (see [themes.css](../react-app/src/lib/theme.ts)). |
| `--initial_view <view>` | One of `year`, `month`, `day`, `photo` — where the gallery lands when entered. |
| `--hostname <regex>` | Hostname regex (e.g. `^travel\.` ) that this gallery should be the default for. Lets a single instance serve multiple vhosts (see the nginx section in the top-level README). |

#### `photo.ts [options] [json-or-jpg-files…]`

Registers photos in the DB and (optionally) links them to one or more galleries. Accepts either JSON sidecars produced by the converter or bare JPG paths (the bare-JPG mode stores just the filename as the photo ID, no EXIF).

| Flag | Purpose |
| --- | --- |
| `--gallery <id>` | Gallery to link the photo(s) to. Repeat for multiple. |
| `--title <s>` | Override the photo's title. |
| `--description <s>` | Override the description. |
| `--country <cc>` | Override the country (ISO 3166-1 alpha-2). |
| `--place <s>` | Override the free-form place description. |
| `--author <s>` | Override the author. |
| `--camera-make`, `--camera-model`, `--lens-make`, `--lens-model` | Override gear strings (useful when EXIF is missing or wrong). |
| `--focal <mm>` | Override focal length. |
| `--aperture <f>` | Override aperture (f-number). |

Overrides apply to every photo in the invocation, so this is the natural way to tag a whole trip:

```sh
./bin/photo.ts photos/inbox/*.json \
  --gallery dailybw \
  --country jp \
  --place "Yokohama, Kanagawa"
```

#### `dump-exif.ts` (converter)

Sibling utility in [converter/bin/](../converter/bin/). Prints the raw EXIF for one or more files — useful when debugging "why didn't this photo get processed" or "what tag is the converter looking at." Run via `npm run dumpexif -- <files>` from the converter directory.

#### `start-prod.sh` / `start-dev.sh`

Wrapper scripts that source `.env` from the current working directory, prepend the workspace's `node_modules/.bin` to `PATH`, and start the process under pm2 (prod) or in the foreground (dev). One pair per package — server, converter, and react-app. See the top-level README's Multi-Instance and Dev Mode sections for the invocation patterns.

## Public API

### Access control

The access control has three levels of increasing access:

1. No access
2. View access
3. Admin access

An access level can be assigned to each user globally, or to any number of galleries.

Gallery-level access is also hierarchical, with increasing scope:

1. Specific gallery
2. Virtual gallery ":public", matching all galleries and their photos
3. Virtual gallery ":all", matching all photos, including those in ":private"

### RESTful resources

The required access level is listed in brackets at the end of each resource method. The access levels are hierarchical, with the following, ascending priority:

1. **[gallery/view]** – User with view access assigned to the specific gallery, ":public", or ":all"
2. **[view]** – User with global (":all") view access
3. **[gallery/admin]** – User with admin access assigned to the specific gallery, ":public", or ":all"
4. **[admin]** – User with global (":all") admin acces
5. **[none]** – A user with access explicitly denied
6. **[any]** – Any user with an account

- `/meta`
  - `GET` – List all metadata **[any]**
  - `POST` – Create a new metadata **[admin]**
    1. `meta`
    - Returns `meta`
  - `GET ../:key` – Get metadata for the ky **[admin]**
    - Returns `meta`
  - `PUT ../:key` – Update metadata **[admin]**
    1. `meta`
    - Returns `meta`
  - `DELETE ../:key` – Delete metadata **[admin]**
- `/tokens`
  - `POST` – Login, create an authentication token **[any]**
    1. `id`
    2. `password`
    - Returns `token`
  - `GET` – Verify the current authenticatio ntoken **[any]**
  - `DELETE` – Logout, revoke all tokens for the current user **[any]**
  - `DELETE ../:userId` – Logout, revoke all tokens for the user **[admin]**
- `/users`
  - `GET` – List all users **[admin]**
  - `POST` – Create a new user **[admin]**
    1. `user`
    - Returns `users`
  - `GET ../:userId` – Get user **[admin]**
    - Returns `user`
  - `PUT ../:userId` – Update user **[admin]**
    1. `user`
    - Returns `user`
  - `DELETE ../:userId` – Delete user **[admin]**
- `/galleries`
  - `GET` – List all galleries the user has access to **[view]**
    - Returns `galleries`
  - `POST` – Create a new gallery **[admin]**
    1. `gallery`
    - Returns `gallery`
  - `GET ../:galleryId` – Get gallery and its photos **[gallery/view]**
  - `PUT ../:galleryId` – Update gallery **[gallery/admin]**
    1. `gallery`
    - Returns `gallery`
  - `DELETE ../:galleryId` – Delete gallery **[gallery/admin]**
- `/photos`
  - `GET` – Get all photos **[view]**
    - Returns `photos`
  - `POST` – Create a new photo **[admin]**
    1. `photo`
    - Returns `photo`
  - `GET ../:photoId` – Get photo **[view]**
    - Returns `photo`
  - `PUT ../:photoId` – Update photo **[admin]**
    1. `photo`
    - Returns `photo`
  - `DELETE ../:photoId` – Delete photo **[admin]**
- `/gallery-photos`
  - `GET ../:galleryId/` – Get all photos in the gallery **[gallery/view]**
    - Returns `photos`
  - `GET ../:galleryId/:photoId` – Get photo in gallery context **[gallery/view]**
    - Returns `photo`
  - `PUT ../:galleryId/:photoId` – Link photo to gallery **[gallery/admin]**
  - `DELETE ../:galleryId/:photoId` – Unlink photo from gallery **[gallery/admin]**

### Entities

TBD

- `session`
- `user`
- `galleries`
- `gallery`
- `photos`
- `photo`

## Internal API

### DB API

- Meta
  - `loadMetas()` – Load all metadata
  - `createMeta(user)` – Create a metadata with the given properties
  - `loadMeta(key)` – Load the metadata
  - `updateMeta(key, meta)` – Update the metadata with the new properties
  - `deleteMeta(key)` – Delete the metadata
- User
  - `loadUsers()` – Load all users
  - `createUser(user)` – Create a user with the given properties
  - `loadUser(userId)` – Load the user
  - `updateUser(userId, user)` – Update the user with the new properties
  - `deleteUser(userId)` – Delete the user
- ACL
  - `loadUserAccessControl(userId)` – Load ACL for the user, with default values from :guest
- Gallery
  - `loadGalleries()` – Load all galleries
  - `createGallery(gallery)` – Create a gallery with the properties
  - `loadGallery(galleryId)` – Load the gallery
  - `updateGallery(galleryId, gallery)` – Update the gallery with the new properties
  - `deleteGallery(galleryId)` – Delete the gallery
- Gallery-Photo
  - `loadGalleryPhotos(galleryId)` – Load all photos linked to the gallery
  - `linkGalleryPhoto(galleryIds, photoIds)` – Link the photo to galleries
  - `loadGalleryPhoto(galleryId, photoId)` – Load the photo in the gallery context
  - `unlinkGalleryPhoto(galleryId, photoId)` Unlink the photo from the gallery
  - `unlinkAllPhotos(galleryId)` – Unlink all photos from the gallery
  - `unlinkAllGalleries(photoId)` – Unlink the photo from all galleries
- Photo
  - `loadPhotos()` – Load all photos
  - `createPhoto(photo)` – Create a photo with the properties
  - `loadPhoto(photoId)` – Load the photo
  - `updatePhoto(photoId, photo)` – Update the photo with the new properties
  - `deletePhoto(photoId)` – Delete the photo
