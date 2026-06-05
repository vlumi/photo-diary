// Helpers for the photo.coords lifecycle shared between:
//   - the admin `PUT /api/v1/photos/<id>` handler,
//   - the converter's JSON-sidecar intake (`processJson`),
//   - the CLI `bin/photo.ts update --latitude/--longitude` flow.
//
// All three need the same "did the operator actually move the
// pin?" check so the geocoded_* clear + Nominatim re-fetch only
// fires on real changes.

export interface CoordPatch {
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
}

// Pull coords out of an incoming PATCH body (`{ taken: { location:
// { coordinates: { latitude, longitude, altitude } } } }`).
// Returns undefined when the body doesn't touch coords at all —
// callers shouldn't trigger the geocoded clear in that case.
export const readIncomingCoords = (
  body: Record<string, unknown>
): CoordPatch | undefined => {
  const taken = body?.taken as
    | { location?: { coordinates?: CoordPatch } }
    | undefined;
  const coords = taken?.location?.coordinates;
  return coords && typeof coords === "object" ? coords : undefined;
};

// Pull current coords out of a loaded photo row. Always returns
// a fully-shaped CoordPatch (axes default to null) so axis-by-
// axis comparison via `coordsDiffer` is well-defined.
export const readCurrentCoords = (
  photo: Record<string, unknown>
): CoordPatch => {
  const taken = photo?.taken as
    | { location?: { coordinates?: CoordPatch } }
    | undefined;
  const coords = taken?.location?.coordinates;
  return {
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    altitude: coords?.altitude ?? null,
  };
};

// True if `after` actually moves any axis. `undefined` on `after`
// means "patch didn't touch this axis" — skip. `null` vs number
// is a real change.
export const coordsDiffer = (
  before: CoordPatch,
  after: CoordPatch
): boolean => {
  const axes: Array<keyof CoordPatch> = [
    "latitude",
    "longitude",
    "altitude",
  ];
  for (const axis of axes) {
    if (after[axis] === undefined) continue;
    if ((before[axis] ?? null) !== (after[axis] ?? null)) return true;
  }
  return false;
};

// Build the post-merge coords by overlaying `after` onto `before`
// (axes the patch left undefined keep their existing value).
export const mergeCoords = (
  before: CoordPatch,
  after: CoordPatch
): CoordPatch => ({
  latitude: after.latitude !== undefined ? after.latitude : before.latitude,
  longitude:
    after.longitude !== undefined ? after.longitude : before.longitude,
  altitude:
    after.altitude !== undefined ? after.altitude : before.altitude,
});
