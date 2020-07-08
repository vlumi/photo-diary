# Photo Diary Converter

The converter is a tool to convert images for the Photo Diary, preparing the data for import into the server. Monitoring an `inbox` directory, it will:

- Extract the EXIF information from the photos, storing them as `<file-base-name>.json` into the `inbox` directory
- Generate the display and thumbnail sizes of each photo
  - Put them into the `display` and `thumbnail` directories respectively
- Move each original photo to `original` folder after completing

The root directory is passed using the `ROOT` environment variable, with the contained directory structure expected to be as follows:

- `root`
  - `inbox`
  - `original`
  - `display`
  - `thumbnail`

## Requirements

- [Node.js](https://nodejs.org) stack
  - [npm](https://www.npmjs.com/) (tested on 6.14.5)
  - [Node.js](https://nodejs.org) (tested on 14.5.0)
- Dependencies
  - [ImageMagick](https://imagemagick.org) (tested on 7.0.10)
