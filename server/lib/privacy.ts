import db from "../db/index.js";

/**
 * Resolves the privacy cascade for the map / photo coordinates.
 *
 * The cascade lives entirely in the `acl` table, leveraging the existing
 * `:guest` user and `:all` gallery sentinels. The most specific ACL row
 * with a non-null `hide_map` wins:
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

/**
 * Mutates a photo's coordinates in place to null when the privacy cascade
 * resolves to hide. The frontend's `photo.hasCoordinates()` check then
 * returns false, and the map widget self-suppresses (no positions → no
 * map). Belt-and-suspenders alongside the gallery-payload `hideMap` flag.
 */
interface PhotoLike {
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

export const maskCoordinates = <T extends PhotoLike>(photos: T[]): void => {
  for (const photo of photos) {
    const coords = photo.taken?.location?.coordinates;
    if (coords) {
      coords.latitude = null;
      coords.longitude = null;
      coords.altitude = null;
    }
  }
};
