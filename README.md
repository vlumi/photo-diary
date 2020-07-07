# Photo-diary

This project is intended to create an online photo gallery, with the photos arranged by the date they were shot, in monthly views. This will (hopefully, eventually) replace the legacy [gallery](https://github.com/vlumi/gallery).

## Planned Features

- Photos segmented into galleries
  - Each photo can be in any number of galleries
  - Single level -- no nesting
  - One gallery view at a time
  - Virtual root configuration based on URL
    - Host/domain, path
  - Special galleries for more abstract concepts
    - :all includes all photos
    - :none includes all photos that don't belong to any galleries
- SPA view
  - Fast transition between views
    - Pre-load current gallery
  - Yearly view
    - No thumbnails, just heat for months/days with photos
      - Link to open month/day
    - Navigation to previous/next year
  - Monthly view
    - Photos shown grouped by date, chronologically
      - Thumbnails
    - Navigation to previous/next month
  - Single photo view
    - As layer above current view
    - Navigation to previous/next photo
      - Thumbnail preview
      - Previous/next photo pre-load caching
      - Automatic switch of monthly view on crossing month boundary
- Statistics view
  - Number of photos by year/month
    - Total and average
  - Month-of-year distribution
  - Weekday distribution
  - Time-of-day distribution
  - Camera/lens make/model distribution
  - Exposure value distribution
    - Focal length
    - Aperture
    - Shutter speed
    - ISO
  - Author distribution
  - Country distribution
- Admin view
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
    - OAuth?
  - Session management
- Authorization
  - Restricted access to galleries and functionality
    - No access restrictions planned for the actual photo content, which may be in a CDN
  - Multiple access levels
    - Guest
      - Not logged in
      - View access to unrestricted galleries
    - User
      - View access to unrestricted and granted galleries
      - View/revoke own sessions
      - Update own user information
      - Delete own user
    - Gallery admin
      - On top of user access
      - Admin access to granted galleries
        - Add, update, unlink photos
        - Remove photos that are only linked to granted galleries
        - Grant/revoke user access to granted galleries
    - Global admin
      - View and admin access to all galleries
        - Including special galleries
      - Create, update, delete galleries
      - Add, update, link, remove orphaned photos
      - Add, update, remove users

## Running Instructions

The back-end server can be started as:

```
node server/index.js
```

### Environment Variables

Certain parameters are passed through environment veriables. These can be either exported before running, adding inline- to the command when starting, or added to the file `env`, from which they will be picked up by [dotenv](https://www.npmjs.com/package/dotenv).

- `PORT` (default: 4200)
- `DB_DRIVER` \*
  - The driver to use for the backend DB connection.
  - Currently implemented:
    - `dummy` -- data hard-coded into the driver, for testing purposes only
    - `legacy_sqlite3` -- DB from [gallery](https://github.com/vlumi/gallery)
      - No ACL (no admin access support, everyone has global view access)
      - Limited photo property support (e.g. gear)
    - TBD: modernized `sqlite3`, `postgresql`, etc.
- `DB_OPTS` (\* depends on `DB_DRIVER`)
  - This parameter will be passed to the `DB_DRIVER` during connection.
    - `dummy` -- Not used
    - `legacy_sqlite3` -- Path to the DB file

### Examples

- With the variables in `.env`:
  - `npm run dev`
  - `npm run prod`
- With the variables inlined:
  - `DB_DRIVER=dummy npm run dev`
  - `DB_DRIVER=legacy_sqlite3 DB_OPTS=/path/to/gallery.sqlite3 npm start`
  - `DB_DRIVER=legacy_sqlite3 DB_OPTS=/path/to/gallery.sqlite3 npm prod`

## TODO

- Back-end
  - DB
    - New schema
  - Modification API for admin
    - Gallery
    - Photo
    - Gallery-photo linking
    - User
    - User-gallery ACL
- Front-end
  - Gallery view
    - Yearly
    - Monthly
    - Individual photo
  - Statistics
  - Admin
