import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { NotFoundError } from "./errors.js";
import logger from "./logger.js";

const PHOTO_ROOT = path.join(process.cwd(), "photos");
const DISPLAY_DIR = path.join(PHOTO_ROOT, "display");
const ICON_DIR = path.join(PHOTO_ROOT, "gallery-icons");
const ICON_SIZE = 160;

// Must crop the exact rendition the UI cropped against — different
// pixel space would silently offset / scale the saved coords.
const resolveSourcePath = async (
  sourcePhotoId: string,
  sourceMaxDim: number
): Promise<string | null> => {
  const candidate = path.join(
    DISPLAY_DIR,
    String(sourceMaxDim),
    sourcePhotoId
  );
  try {
    await fs.promises.access(candidate, fs.constants.R_OK);
    return candidate;
  } catch {
    return null;
  }
};

export interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

// `gallery.icon` value the cropper writes. Resolves under
// `PHOTO_ROOT_URL` on the client side (`{PHOTO_ROOT_URL}{icon}`).
const iconRelPath = (galleryId: string): string =>
  `gallery-icons/${galleryId}.jpg`;

// Crop the photo's display variant to the requested square, resize
// to 160x160, and write under `photos/gallery-icons/<galleryId>.jpg`.
// Returns the relative path stored in `gallery.icon`.
//
// `.rotate()` with no arg applies the source's EXIF orientation so
// the pixel space matches what the browser-side cropper saw — without
// it, react-easy-crop's coords (in the displayed, auto-rotated
// orientation) miss the raw-orientation image sharp reads.
export const writeGalleryIcon = async (
  galleryId: string,
  sourcePhotoId: string,
  crop: CropPixels,
  sourceMaxDim: number
): Promise<string> => {
  await fs.promises.mkdir(ICON_DIR, { recursive: true });
  const sourcePath = await resolveSourcePath(sourcePhotoId, sourceMaxDim);
  if (!sourcePath) {
    throw new NotFoundError(
      `Source rendition display/${sourceMaxDim}/${sourcePhotoId} not found on disk`
    );
  }
  const outPath = path.join(ICON_DIR, `${galleryId}.jpg`);
  const oriented = sharp(sourcePath).rotate();
  const { width: srcWidth = 0, height: srcHeight = 0 } =
    await oriented.metadata();
  const left = Math.max(0, Math.min(srcWidth - 1, Math.round(crop.x)));
  const top = Math.max(0, Math.min(srcHeight - 1, Math.round(crop.y)));
  const width = Math.max(1, Math.min(srcWidth - left, Math.round(crop.width)));
  const height = Math.max(1, Math.min(srcHeight - top, Math.round(crop.height)));
  await oriented
    .extract({ left, top, width, height })
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
