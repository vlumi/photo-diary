# Photo Diary Converter

The converter is a tool to convert images for the Photo Diary, preparing the data for import into the server. Monitoring an `inbox` directory, it will:

- Extract the EXIF information from the photos, storing them as `<file-base-name>.json` into the `inbox` directory.
- Generate one or more downscaled display renditions plus a thumbnail for each photo.
  - Display renditions are driven by the `renditions` meta key (admin-editable from `/m/instance`, a JSON-encoded list of `maxDim` integers; the default is `[1500]`). Each entry writes `photos/display/<maxDim>/<id>.jpg` and inserts a `photo_rendition` row so the SPA's `<img srcset>` picks the best fit per viewport and DPR.
  - The thumbnail is fixed (600×200 box, cropped, native size on calendar tiles) and lives at `photos/thumbnail/<id>.jpg`.
- Move each original photo to the `original/` directory after completing.

The photo repository lives at a fixed path: `<cwd>/photos/`, where `<cwd>` is the converter's working directory (the instance directory when launched via `bin/start-prod.sh`). The directory structure is:

- `photos/`
  - `inbox/` – The converter monitors this directory for new photos, also producing the JSON files here.
  - `original/` – Original photos are moved here after processing.
  - `thumbnail/` – Thumbnails are generated here.
  - `display/<maxDim>/` – One subdirectory per configured rendition size, auto-created on first intake.

Operator scripts:

- `bin/photo-rerender.ts` (default `scan` mode) — register every `photos/display/<maxDim>/*.jpg` file in `photo_rendition`. The intended flow: render a larger variant locally, rsync `display/<maxDim>/` up, run the script.
- `bin/photo-rerender.ts generate <maxDim>` — server-side render missing variants at the given size from `photos/original/<id>.jpg`. Skips photos whose original isn't on the server.
- `bin/photo-rerender.ts prune` — drop `photo_rendition` rows whose file is gone.

If the photo repository lives on a different disk, symlink the `photos/` subdirectory (or the whole instance dir).

## Requirements

- [Node.js](https://nodejs.org) 22 or newer; npm 10+ recommended
- No external CLI dependencies — image resizing is done via [sharp](https://sharp.pixelplumbing.com/) (libvips bindings shipped via npm)

## Running Instructions

The converter is TypeScript and runs via tsx (no build step). Common scripts:

```sh
npm run dev        # tsx watch index.ts
npm start          # tsx index.ts
npm run prod       # invokes bin/start-prod.sh (pm2 + .env + INSTANCE_NAME-derived name)
npm test           # tsx --test tests/**/*.test.ts
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm run dumpexif   # tsx bin/dump-exif.ts — utility for inspecting a photo's EXIF
```

The `bin/start-dev.sh` and `bin/start-prod.sh` wrappers source `.env` from the current working directory (the instance dir) and PATH-prepend the workspace's hoisted `node_modules/.bin` so `tsx` resolves under npm workspaces.

Run from the instance directory (which must contain a `photos/` subdirectory with the structure above). In a single-instance setup that's the converter directory itself; in a multi-instance deploy, that's `/var/photo-diary/<name>/` and `bin/start-prod.sh` is invoked via the instance's `code` symlink (see the top-level README's Multi-Instance Deployment section).
