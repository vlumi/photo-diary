# Photo Diary Server

This server implements the RESTful API of the Photo Diary

## Requirements

- Recent [Node.js](https://nodejs.org) stack
  - [npm](https://www.npmjs.com/) (tested on 6.14.5)
  - [Node.js](https://nodejs.org) (tested on 14.5.0)
- Dependencies
  - [Express](https://expressjs.com/) (tested on 4.17.1)
  - Check `package.json` for more detailed dependencies

## Public API

### Access control

The access control has three levels of increasing access:

1. No access
2. View access
3. Admin access

An access level can be assigned to each user globally, or to any number of galleries.

### RESTful resources

The required access level is listed in brackets at the end of each resource method. The access levels are hierarchical, with the following, ascending priority:

1. **[gallery/view]** – User with view access assigned to gallery
2. **[view]** – User with global view access
3. **[gallery/admin]** – User with admin access assigned to gallery
4. **[admin]** – User with global admin acces
5. **[none]** – A user with access explicitly denied
6. **[any]** – Any user with an account

- `/sessions`
  - `POST` – Login, create a session **[any]**
    1. `username`
    2. `password`
    - Returns `session`
  - `DELETE` – Logout, revoke current session **[any]**
- `/sessions/revoke-all`
  - `POST` – Revoke all sessions for user **[any]**
    1. `username`
    2. `password`
  - `DELETE ../:username` – Revoke any user's sessions **[admin]**
- `/user` – TBD
- `/stats`
  - `GET` – Global statistics **[view]**
    - Returns `stats`
  - `GET ../:galleryId` – Gallery statistics **[view]**
    - Returns `stats`
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
- `stats`
- `galleries`
- `gallery`
- `photos`
- `photo`

## Internal API

### DB API

TBD

- `loadUserAccessControl(username)`
- `loadUser(username)`
- `loadGalleries()`
- `loadGallery(galleryId)`
- `loadGalleryPhotos(galleryId)`
- `loadGalleryPhoto(galleryId, photoId)`
- `loadPhotos()`
- `loadPhoto(photoId)`
