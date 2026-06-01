/* eslint-disable @typescript-eslint/no-explicit-any */
import db from "../db/index.js";

// Find the existing row to update for a photo whose `id` in the input
// JSON may be the stable id, the legacy filename-id, or just the
// original camera filename (e.g. IMG_1234.jpg). Used by the converter's
// JSON-sidecar pipeline.
//
// Chain:
//   1. exact `id` match — direct hit; also catches legacy rows.
//   2. originalFilename match narrowed by taken.instant.timestamp —
//      filename alone isn't proof of identity (counter rollovers,
//      multi-camera setups), so always confirm by timestamp.
//   3. no match → create.
//   ambiguous (multiple originalFilename hits with no timestamp
//   discriminator) → loud error; never silently merge unrelated
//   photos.

export type Lookup =
  | { kind: "update"; existingId: string }
  | { kind: "create" }
  | { kind: "ambiguous"; candidates: any[] };

export const lookup = async (photo: any): Promise<Lookup> => {
  if (!photo.id) return { kind: "create" };

  try {
    await db.loadPhoto(photo.id);
    return { kind: "update", existingId: photo.id };
  } catch {
    /* fall through */
  }

  const candidates = (await db.loadPhotosByOriginalFilename(photo.id)) as any[];
  if (candidates.length === 0) return { kind: "create" };

  const wantTaken = photo.taken?.instant?.timestamp;
  if (wantTaken) {
    const matches = candidates.filter(
      (c) => c.taken?.instant?.timestamp === wantTaken
    );
    if (matches.length === 1) {
      return { kind: "update", existingId: matches[0].id };
    }
  }
  return { kind: "ambiguous", candidates };
};
