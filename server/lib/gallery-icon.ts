import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

import logger from "./logger.js";

// Icon source = the photo's `display/<id>` variant (~1280-1600px
// wide). Plenty of resolution for a 160x160 output crop, and
// independent of whether originals are kept on the server.
const DISPLAY_DIR = path.join(process.cwd(), "photos", "display");
const ICON_DIR = path.join(process.cwd(), "photos", "gallery-icons");
const ICON_SIZE = 160;

export interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

// `gallery.icon` value the cropper writes. Resolves under
// `PHOTO_ROOT_URL` on the client side (`{PHOTO_ROOT_URL}{icon}`).
export const iconRelPath = (galleryId: string): string =>
  `gallery-icons/${galleryId}.jpg`;

// Crop the photo's display variant to the requested square, resize
// to 160x160, and write under `photos/gallery-icons/<galleryId>.jpg`.
// Returns the relative path stored in `gallery.icon`.
export const writeGalleryIcon = async (
  galleryId: string,
  sourcePhotoId: string,
  crop: CropPixels
): Promise<string> => {
  await fs.promises.mkdir(ICON_DIR, { recursive: true });
  const sourcePath = path.join(DISPLAY_DIR, sourcePhotoId);
  await fs.promises.access(sourcePath, fs.constants.R_OK);
  const outPath = path.join(ICON_DIR, `${galleryId}.jpg`);
  await sharp(sourcePath)
    .extract({
      left: Math.max(0, Math.round(crop.x)),
      top: Math.max(0, Math.round(crop.y)),
      width: Math.max(1, Math.round(crop.width)),
      height: Math.max(1, Math.round(crop.height)),
    })
    .resize(ICON_SIZE, ICON_SIZE, { fit: "cover" })
    .jpeg({ quality: 90 })
    .toFile(outPath);
  return iconRelPath(galleryId);
};

// Best-effort cleanup on gallery delete. Missing file is fine.
export const removeGalleryIcon = async (galleryId: string): Promise<void> => {
  const target = path.join(ICON_DIR, `${galleryId}.jpg`);
  try {
    await fs.promises.unlink(target);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.error("Failed to remove gallery icon file", { err, galleryId });
    }
  }
};
