# Photo Diary Server

This server implements the RESTful API of the Photo Diary

## Requirements

- Recent [Node.js](https://nodejs.org) stack
  - [npm](https://www.npmjs.com/) (tested on 6.14.6)
  - [Node.js](https://nodejs.org) (tested on 14.5.0)
- Dependencies
  - [Express](https://expressjs.com/) (tested on 4.17.1)
  - Check `package.json` for more detailed dependencies

## Running Instructions

The back-end server can be started as:

```
node index.js
```

### Environment Variables

Certain parameters are passed through environment veriables. These can be either exported before running, adding inline- to the command when starting, or added to the file `env`, from which they will be picked up by [dotenv](https://www.npmjs.com/package/dotenv).

- `PORT` (default: 4200)
- `DB_DRIVER` \*
  - The driver to use for the backend DB connection.
  - Currently implemented:
    - `sqlite3` – Latest schema with all current features implemented
    - `dummy` – data hard-coded into the driver, for testing purposes only
    - `legacy_sqlite3` – DB from [gallery](https://github.com/vlumi/gallery)
      - No ACL (no admin access support, everyone has global view access)
      - Limited photo property support (e.g. gear)
    - TBD: `postgresql`, `mysql`, etc.
- `DB_OPTS` (\* depends on `DB_DRIVER`)
  - This parameter will be passed to the `DB_DRIVER` during connection.
    - `sqlite3` – Path to the DB file
    - `dummy` – Not used
    - `legacy_sqlite3` – Path to the DB file
- `REACT_APP_PHOTO_ROOT_DIR` \*
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
  - `DB_DRIVER=dummy npm run dev`
  - `DB_DRIVER=sqlite3 DB_OPTS=/path/to/gallery.sqlite3 npm start`
  - `DB_DRIVER=sqlite3 DB_OPTS=/path/to/gallery.sqlite3 npm prod`

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

- `/tokens`
  - `POST` – Login, create an authentication token **[any]**
    1. `id`
    2. `password`
    - Returns `token`
  - `GET` – Verify the current authenticatio ntoken **[any]**
  - `DELETE` – Logout, revoke all tokens for the current user **[any]**
  - `DELETE ../:userId` – Logout, revoke all tokens for the user **[admin]**
- `/user`
  - `GET` – List all users **[admin]**
  - `POST` – Create a new user **[admin]**
    1. `user`
    - Returnes `users`
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
