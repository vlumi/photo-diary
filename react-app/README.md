# Photo Diary React App

This is a web application for the Photo Diary, implemented using React.

## Requirements

- Recent [Node.js](https://nodejs.org) stack
  - [npm](https://www.npmjs.com/) (tested on 6.14.7)
- Dependencies
  - Photo Diary server
  - Check `package.json` for more detailed dependencies

## Running Instructions

The front-end server can be started as:

```
node start
```

The server will by default start on port `3000`. Use the environment variable `PORT` to change the port, e.g.

```
PORT=3001 node start
```

### Environment Variables

- `REACT_APP_PHOTO_ROOT_URL` \*
  - The URL to the physical photos, with the following sub-directories
    - `display` – Display-size, large photos
    - `thumbnail` – Thumbnail-size, small photos
- `PORT` (default: 3000)
- `REACT_APP_THEME`
  - The built-in color theme to use, configured in `themes.css`, with currently the following available:
    - `blue` (default)
    - `red`
    - `grayscale`
- `REACT_APP_DEFAULT_GALLERY`
  - If the default gallery is set, accessing the gallery list will instead redirect to the gallery.
- `REACT_APP_FIRST_WEEKDAY`
  - The first day of the week, e.g. `1` = Monday, `0` = Sunday

## Features

TBD

## Structure

TBD

### Components

TBD
