# Changelog

## [Unreleased]
- Add aspect ratio to statistics

## [0.5.0] - 2021-12-23
- Add version number (v1) to API path
- Remove support for the old legacy_sqlite3 DB schema
- Add instance metadata API and backing DB
  - Remove the unused legacy SCHEMA_INFO table
  - Add the META table
  - Add new RESTful end-point `/api/v1/meta`
- Use `cdn` from meta as the default photo root URL
- Display the `name` and `description` from meta on the gallery list page
- Fix empty title to be a link to the gallery list

## [0.4.2] - 2021-02-26
- Upgrade all dependencies to latest, including React 17

## [0.4.1] - 2020-08-21

- UI tweaks and fixes
- Major code refactoring
  - Re-organize code hierarchy
  - Switch to using styled components
  - Better unit test coverage

## [0.4.0] - 2020-08-03

- Photo property filters
  - Filter the content by photo properties in any of the topics and categories of statistics
    - General: author, country
    - Time: year/month, year, month, weekday, hour
    - Gear: camera make, camera, lens, camera/lens
    - Exposure: focal length, aperture, shutter speed, sensitivity, EV, LV, resolution
  - Filters within a category are additive, matching all photos that match any of them
  - Filters across categories are subtractive, matching photos that match the filters in all categories
  - Set filters apply in all views
    - Gallery and statistics
  - Filters can be added and cleared in all views
    - Toolbar in all views
    - Clicking on individual values on statistics tables

## [0.3.0] - 2020-07-31

- Statistics view
  - Separate for each gallery, including virtual
- Marker paths to embedded map, in chronological order
- API changes
  - Remove `/api/stats`, moving the statistics generation client-side
  - Flatten the returned `photos` in `/api/gallery`, removing the year/month/day hierarchy

## [0.2.1] - 2020-07-27

- Embedded map with markers of the photo(s) on year, month, day, and photo views
  - Marker popup with small thumbnail and date
  - No grouping of nearby markers
- Language selection and minimal localization
  - English, Finnish, Japanese

## [0.2.0] - 2020-07-25

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

## [0.1.1] - 2020-07-20

- Usability improvements and polish
- Setup to run in production mode

## [0.1.0] - 2020-07-18

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

## Initial commit - 2020-07-04

[Unreleased]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/vlumi/photo-diary/compare/v0.4.2...v0.5.0
[0.4.2]: https://github.com/vlumi/photo-diary/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/vlumi/photo-diary/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/vlumi/photo-diary/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/vlumi/photo-diary/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/vlumi/photo-diary/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/vlumi/photo-diary/compare/v0.1.1...v0.2.0
[0.2.0]: https://github.com/vlumi/photo-diary/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/vlumi/photo-diary/releases/tag/v0.1.0