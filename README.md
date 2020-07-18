# Photo Diary

**This project is a **_work in progress_**.**

This project is intended to create an online photo gallery, with the photos arranged by the date they were shot, in monthly views. This will (hopefully, eventually) replace the legacy [gallery](https://github.com/vlumi/gallery).

## Structure

Photo Diary is split into separate independent modules, each handling its own sub-system:

- [react-app](react-app) – Front-end web app
- [server](server) – Back-end API
- [converter](converter) – Back-end process for pre-processing new photos to be added to the gallery

## Roadmap

### Milestone 0.1

On par with [gallery](https://github.com/vlumi/gallery).

- Back-end
  - Read-only
  - Using existing [gallery](https://github.com/vlumi/gallery) schema
- Front-end
  - Responsive
  - Read-only
  - Gallery view
    - Yearly
    - Monthly
    - Daily
    - Individual photo

### Milestone 0.2

- Back-end
  - New schema
    - Users, authentication and authorization
    - More photo metadata
    - Migrate from SQLite -> ???
  - New command-line tool for managing DB content

### Milestone 0.3

- Front-end
  - Statistics
    - More dynamic -- filters
      - By gallery
      - By gear
      - By author
      - By exposure settings
      - By country
      - By time
        - By year
        - By year/month
        - By year/month/day
        - By range

### Milestone 1.0

- Back-end
  - Modification API
    - User
    - User-gallery ACL
    - Gallery
    - Photo
    - Gallery-photo linking
- Front-end
  - Global admin view
    - Manage users & ACL
    - Manage galleries
    - Manage photos
    - Manage gallery/photo linking

## Backlog

This features would be nice to have, but are too far into the future to put on the roadmap.

- Front-end
  - Gallery view
    - Multiple display sizes, dynamically chosen to match client window size
    - Photo license information
      - Permit/deny original size download by users
  - Gallery admin view (TBD)
    - Manage authorized galleries
    - Manage photos linked to only authorized galleries
    - Manage gallery/photo linking
  - Support for localization
    - English, Finnish, Japanese, ...

## Planned Features

- Photos segmented into galleries
  - Each photo can be in any number of galleries
  - Single level – no nesting
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

## Version History

- 0.1.0 (2020-07-18)
  - New front-end app
    - Read-only views for browsing/viewing
      - Front page with list of galleries
        - Can be skipped by setting a default gallery
      - Year view
        - Optionally all years by setting the year parameter negative
        - Calendar layout, with days heat-mapped by number of photos
      - Month view
        - Photos group by day, same as [gallery](https://github.com/vlumi/gallery)
      - Day view
        - Same as month view, but restricted to a single day
      - Single photo view
        - A single photo in larger size with properties
  - Back-end API
    - RESTful JSON API
    - Abstract DAO layer for future DB migration
      - Legacy [gallery](https://github.com/vlumi/gallery), read-only DB driver
      - Dummy DB driver for unit tests
    - Currently unused features already implemented
      - Token-based user and access control
      - More photo metadata
  - Dependent on parts of [gallery](https://github.com/vlumi/gallery)
    - DB
    - Admin tools
    - Statistics
  