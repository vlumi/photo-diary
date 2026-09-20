import db from "../db/index.js";

/**
 * Resolves the privacy cascade for the map / photo coordinates.
 *
 * The cascade lives entirely in the `user_gallery` table, leveraging the
 * existing `:guest` user and `:all` gallery sentinels. The most specific
 * row with a non-null `hide_map` wins:
 *
 *   1. (userId,  galleryId) — per-user, per-gallery
 *   2. (:guest,  galleryId) — per-gallery default
 *   3. (userId,  :all)      — per-user default
 *   4. (:guest,  :all)      — global default
 *
 * If no row at any level has a non-null `hide_map`, coordinates are shown
 * (default false).
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
 * neighbourhood and postcode say nearly as much. The place name, city
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
