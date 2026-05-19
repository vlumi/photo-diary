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
npm run build:ui   # builds the react-app and copies it into server/build/ for prod
```

### Environment Variables

Certain parameters are passed through environment veriables. These can be either exported before running, adding inline- to the command when starting, or added to the file `env`, from which they will be picked up by [dotenv](https://www.npmjs.com/package/dotenv).

- `PORT` (default: 4200)
- `DB_DRIVER` \*
  - The driver to use for the backend DB connection.
  - Currently implemented:
    - `sqlite3` – Default driver, backed by better-sqlite3 (synchronous API)
    - `dummy` – data hard-coded into the driver, for testing purposes only
- `DB_OPTS` (\* depends on `DB_DRIVER`)
  - This parameter will be passed to the `DB_DRIVER` during connection.
    - `sqlite3` – Path to the DB file
    - `dummy` – Not used
- `SECRET` \*
  - HMAC secret used to sign JWT tokens issued at login. Required — the server refuses to start without it.
- `PHOTO_ROOT_DIR` \*
  - The path to the physical photos, with the following sub-directories
    - `inbox` – New photos to be added, or their extracted JSON files
    - `display` – Display-size, large photos
    - `thumbnail` – Thumbnail-size, small photos
    - `original` – The already-processed photos and JSON files

### Examples

- With the variables in `.env`:
  - `npm run dev`
  - `npm run prod`
- With the variables inlined:
  - `SECRET=test DB_DRIVER=dummy npm run dev`
  - `SECRET=… DB_DRIVER=sqlite3 DB_OPTS=/path/to/gallery.sqlite3 npm start`
  - `SECRET=… DB_DRIVER=sqlite3 DB_OPTS=/path/to/gallery.sqlite3 npm run prod`

### Management scripts

Scripts under `bin/` add or update users, galleries, and photos in the DB. They are executable and use a `#!/usr/bin/env -S npx tsx` shebang, so from the `server/` directory they can be run directly:

```sh
./bin/add-user.ts [options]
./bin/add-gallery.ts [options]
./bin/add-photo.ts [options] [json-or-jpg-files]
```

Each script takes `--help` to list its flags. They read the same `.env` as the server, so `SECRET`, `DB_DRIVER`, and `DB_OPTS` need to be set the same way.

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
