# Photo-diary

This project is intended to create an online photo gallery, with the photos arranged by the date they were shot, in monthly views. This will (hopefully, eventually) replace the legacy [gallery](https://github.com/vlumi/gallery).

## Planned Features

* Photos segmented into galleries
  + Each photo can be in any number of galleries
  + Single level -- no nesting
  + One gallery view at a time
  + Virtual root configuration based on URL
    - Host/domain, path
  + Virtual galleries for more abstract concepts
    - :all includes all photos
    - :none includes all photos that don't belong to any galleries
* (?) Yearly view
  + No thumbnails, just numbers/heat for days with photos?
  + Navigation to previous/next year
* Monthly view
  + Photos shown grouped by date, chronologically
    - Thumbnails
  + Navigation to previous/next month
* Single photo view
  + As layer above current view
  + Navigation to previous/next photo
    - Thumbnail preview
    - Previous/next photo pre-load caching
    - Automatic switch of monthly view on crossing month boundary
* Statistics view
  + Number of photos by year/month
  + Weekday distribution
  + Time-of-day distribution
  + Camera make/model distribution
  + Exposure value distribution
    - Focal length
    - Aperture
    - Shutter speed
    - ISO
* Admin view
  + Add new photos
    - Pick up from upload directory on the server
  + Maintain photos
    - Create thumbnail/normal size
    - Extract EXIF
    - Insert into DB
    - Pick galleries for photos
* Authentication
  + User login
  + OAuth?
* Authorization
  + Restricted access to galleries
    - No access restrictions planned for the actual photo content, which may be in a CDN
  + Access to admin functions
  + (?) Multiple access levels
    - Global admin > gallery admin > user > visitor
    - Roles

## TODO

* Back-end
  + DB
  + API
    - Gallery
      - Read-only
      - Modifications by admin
    - Photo
      - Read-only
      - Modifications by admin
    - Statistics
* Front-end
  + Gallery view
    - Montly
    - Individual photo
  + Statistics
