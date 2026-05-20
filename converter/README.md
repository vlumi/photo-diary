# Photo Diary Converter

The converter is a tool to convert images for the Photo Diary, preparing the data for import into the server. Monitoring an `inbox` directory, it will:

- Extract the EXIF information from the photos, storing them as `<file-base-name>.json` into the `inbox` directory
- Generate the display and thumbnail sizes of each photo
  - Put them into the `display` and `thumbnail` directories respectively
- Move each original photo to `original` directory after completing

The photo repository lives at a fixed path: `<cwd>/photos/`, where `<cwd>` is the converter's working directory (the instance directory when launched via `bin/start-prod.sh`). The directory structure is:

- `photos/`
  - `inbox/` – The converter monitors this directory for new photos, also producing the JSON files here.
  - `original/` – Original photos are moved here after processing.
  - `display/` – Standard display-sized photos are generated here.
  - `thumbnail/` – Thumbnail-sized photos are generated here.

If the photo repository lives on a different disk, symlink the `photos/` subdirectory (or the whole instance dir).

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

Run from the instance directory (which must contain a `photos/` subdirectory with the structure above). In a single-instance setup that's the converter directory itself; in a multi-instance deploy, that's `/var/photo-diary/<name>/` and `bin/start-prod.sh` is invoked via the instance's `code` symlink (see the top-level README's Multi-Instance Deployment section).
