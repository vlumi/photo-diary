import fs from "node:fs";
import path from "node:path";

import logger from "./logger.js";

// The converter watches `<cwd>/photos/inbox/` recursively (see
// converter/lib/constants.ts:PHOTO_ROOT_DIR + DIR_INBOX). The server
// runs in the same instance directory, so the same path resolves.
const INBOX_DIR = path.join(process.cwd(), "photos", "inbox");

// Write a minimal JSON sidecar that the converter will pick up and
// route through its existing intake path (`lookup()` → no-op merge
// on the matched row → `geocodeAtIntake` refreshes the geocoded
// columns). The file name embeds the timestamp so concurrent saves
// from the admin UI don't overwrite each other; the converter
// archives processed sidecars to `original/<id>.intake.json` (or
// .N.json) regardless of the inbox filename.
//
// Best-effort: a missing / unwritable inbox dir is logged as a
// warning, not raised, so the API save still succeeds even if the
// geocode refresh path is broken at this instance.
export const writeCoordSidecar = async (
  photoId: string,
  coordinates: {
    latitude?: number | null;
    longitude?: number | null;
    altitude?: number | null;
  }
): Promise<void> => {
  const sidecar = {
    id: photoId,
    taken: { location: { coordinates } },
  };
  try {
    await fs.promises.mkdir(INBOX_DIR, { recursive: true });
    const filename = path.join(INBOX_DIR, `manage-${photoId}-${Date.now()}.json`);
    await fs.promises.writeFile(
      filename,
      JSON.stringify(sidecar, null, 2),
      "utf8"
    );
    logger.debug(`Wrote coord-edit sidecar ${filename}`);
  } catch (err) {
    logger.error(
      "Coord-edit sidecar write failed; photo-geocode won't auto-refresh",
      { err, photoId }
    );
  }
};
