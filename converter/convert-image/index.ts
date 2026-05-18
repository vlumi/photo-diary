import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";

import { DIR_INBOX, type Target } from "../lib/constants.js";
import * as logger from "../lib/logger.js";

export default async (
  fileName: string,
  root: string,
  target: Target
): Promise<void> => {
  const inputPath = path.join(root, DIR_INBOX, fileName);
  const outputPath = path.join(root, target.directory, fileName);

  const { width, height } = target.dimensions;
  logger.debug(`[${fileName}] Resizing to ${width}x${height}`);

  await sharp(inputPath)
    // rotate() with no args reads EXIF orientation and applies it (then strips it).
    .rotate()
    .resize(width, height, { fit: "inside", withoutEnlargement: true })
    .toFile(outputPath);

  await fs.promises.chmod(outputPath, 0o644);
};
