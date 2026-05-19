# Photo Diary Converter

The converter is a tool to convert images for the Photo Diary, preparing the data for import into the server. Monitoring an `inbox` directory, it will:

- Extract the EXIF information from the photos, storing them as `<file-base-name>.json` into the `inbox` directory
- Generate the display and thumbnail sizes of each photo
  - Put them into the `display` and `thumbnail` directories respectively
- Move each original photo to `original` directory after completing

The root directory is passed using the `PHOTO_ROOT_DIR` environment variable, with the contained directory structure expected to be as follows:

- `root` – Common root directory to keep everything together.
  - `inbox` – The converter is monitoring this directory for new photos, also producing the JSON files here.
  - `original` – Original photos will be moved here after they have been processed.
  - `display` – Standard display-sized photos are generated here.
  - `thumbnail` – Thumbnail-sized photos are generated here.

## Requirements

- [Node.js](https://nodejs.org) 22 or newer; npm 10+ recommended
- No external CLI dependencies — image resizing is done via [sharp](https://sharp.pixelplumbing.com/) (libvips bindings shipped via npm)

## Running Instructions

The converter is TypeScript and runs via tsx (no build step). Common scripts:

```sh
npm run dev        # tsx watch index.ts
npm start          # tsx index.ts
npm run prod       # pm2 start --interpreter tsx index.ts (NODE_ENV=prod)
npm test           # tsx --test tests/**/*.test.ts
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm run dumpexif   # tsx bin/dump-exif.ts — utility for inspecting a photo's EXIF
```

Set `PHOTO_ROOT_DIR` either in a `.env` next to `index.ts` or inline before the command.
