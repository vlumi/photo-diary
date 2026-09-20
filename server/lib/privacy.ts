import db from "../db/index.js";

/**
 * Whether the map, and with it photo coordinates, is hidden from this
 * requester in this gallery. The most specific non-null `hide_map`
 * wins (see `resolveHideMap` in the driver for the queries):
 *
 *   1. a global admin always sees the map;
 *   2. the user's own grant on the gallery;
 *   3. the grants of the user's groups on it, where any "hide" beats
 *      a "show";
 *   4. the `:guest` grant on the gallery, which is its default.
 *
 * With nothing set at any level, the map is shown.
 */
export const shouldHideMap = async (
  userId: string,
  galleryId: string
): Promise<boolean> => {
  const value = await db.resolveHideMap(userId, galleryId);
  return value === 1;
};

interface PhotoLike {
  originalFilename?: unknown;
  exifAtIntake?: unknown;
  camera?: { serial?: unknown };
  lens?: { serial?: unknown };
  geocoded?: { address?: unknown };
  taken?: {
    location?: {
      coordinates?: {
        latitude: number | null;
        longitude: number | null;
        altitude: number | null;
      };
    };
  };
}

/**
 * Hides where a photo was taken, in place, when the privacy cascade
 * resolves to hide: coordinates become null (the frontend's
 * `photo.hasCoordinates()` then returns false and the map widget
 * self-suppresses), and the geocoder's address blob goes, since its
 * neighborhood and postcode say nearly as much. The place name, city
 * and country stay: they are what the gallery shows in words.
 */
export const maskCoordinates = <T extends PhotoLike>(photos: T[]): void => {
  for (const photo of photos) {
    const coords = photo.taken?.location?.coordinates;
    if (coords) {
      coords.latitude = null;
      coords.longitude = null;
      coords.altitude = null;
    }
    if (photo.geocoded) delete photo.geocoded.address;
  }
};

/**
 * Removes, in place, what only someone who can act on a photo has a
 * use for: the raw EXIF read at intake (which can carry coordinates
 * and more that the curated fields leave out), the camera's original
 * filename, and the body and lens serial numbers, which identify the
 * owner's equipment across every site they post to.
 */
export const stripOperatorFields = <T extends PhotoLike>(photos: T[]): void => {
  for (const photo of photos) {
    delete photo.exifAtIntake;
    delete photo.originalFilename;
    if (photo.camera) delete photo.camera.serial;
    if (photo.lens) delete photo.lens.serial;
  }
};

/**
 * What every route that sends a gallery's photos to a viewer applies
 * before answering. `photos` may hold `undefined` slots (neighbors).
 */
export const applyViewerPrivacy = async (
  viewer: { hideMap: boolean; isEditor: boolean },
  photos: readonly unknown[]
): Promise<void> => {
  const present = photos.filter(
    (photo): photo is PhotoLike => !!photo && typeof photo === "object"
  );
  if (viewer.hideMap) maskCoordinates(present);
  if (!viewer.isEditor) stripOperatorFields(present);
};
