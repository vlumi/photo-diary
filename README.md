# Photo Diary

Photo Diary is a calendar based gallery for self-hosting. The photos are presented arranged by the date they were shot, in calendar-based views, aimed at diary and other similar photography projects.

Key features include:

- Fast browsing – gallery content (apart from actual photos) loaded once at startup
- Calendar-based views (year, month, day, photo)
- User management and basic access control

## Structure

Photo Diary is split into separate independent modules, each handling its own sub-system:

- [react-app](react-app) – Front-end web app
- [server](server) – Back-end API
- [converter](converter) – Back-end process for pre-processing new photos to be added to the gallery

## Features

- Photos are segmented into galleries
  - Each photo can be in any number of galleries
  - Single level – no nesting
  - One gallery view at a time
  - Virtual default gallery to jump to based on hostname
  - Special galleries for more abstract concepts
    - :all includes all photos
    - :public includes all photos added to galleries
    - :private includes photos not added to any galleries
- SPA view
  - Fast transition between views
    - Pre-load current gallery
  - Fast navigation to previous/next item
    - Left/right arrow keys
    - Swipe left/right
  - Yearly view – Calendar with heat-mapped days
  - Monthly view – Thumbnails grouped by date
  - Daily view – Thumbnails
  - Single photo view – Maximize to visible space, with photo properties
- Statistics view (TBD)
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

## Roadmap

### Milestone 0.3

- Front-end
  - Dynamic statistics, with filters/drill-down
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
  - Fully tested Modification API
    - User
    - ACL
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

## Version History

- current (TBD)
  - Embedded map with markers of the photo(s) on year, month, day, and photo views
    - Marker popup with small thumbnail and date
    - No grouping of nearby markers
  - Language selection and minimal localization
    - English, Finnish, Japanese
- v0.2.0 (2020-07-25)
  - Implement new `sqlite3` schema and driver
    - More photo and gallery metadata
    - User and ACL information
    - CRUD
  - Implement authentication and authorization
  - Implement new command-line tools for managing the DB content, under `server/bin/`
    - `add-user.js`
      - Add a new, or update an existing user
      - ID, password, and ACL information from command-line parameters
    - `add-gallery`
      - Add a new, or update an existing gallery
      - Properties from command-line parameters
    - `add-photo.js`
      - Add new, or update existing photos
      - Input from the JSON produced by [converter](converter) and command-line parameters
      - Also set galleries (unlink & link)
    - Any other management should be done directly to the DB
      - Admin UI is in the pipeline
- v0.1.1 (2020-07-20)
  - Usability improvements and polish
  - Setup to run in production mode
- v0.1.0 (2020-07-18)
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
- Initial commit (2020-07-04)
