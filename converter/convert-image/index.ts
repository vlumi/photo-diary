import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";

import { type Target } from "../lib/constants.js";
import * as logger from "../lib/logger.js";

export default async (
  sourcePath: string,
  id: string,
  root: string,
  target: Target
): Promise<void> => {
  const outputPath = path.join(root, target.directory, id);

  const { width, height } = target.dimensions;
  logger.debug(`[${id}] Resizing to ${width}x${height}`);

  await sharp(sourcePath)
    // rotate() with no args reads EXIF orientation and applies it (then strips it).
    .rotate()
    .resize(width, height, { fit: "inside", withoutEnlargement: true })
    .toFile(outputPath);

  await fs.promises.chmod(outputPath, 0o644);
};
