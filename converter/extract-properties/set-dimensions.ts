import path from "node:path";
import sharp from "sharp";

import {
  DIR_ORIGINAL,
  THUMBNAIL_TARGET,
} from "../lib/constants.js";

type Dimensions = { width: number; height: number };
type Properties = { dimensions?: Record<string, Dimensions> } & Record<string, unknown>;

export default async (
  sourcePath: string,
  id: string,
  rootDir: string,
  properties: Properties
): Promise<Properties> => {
  const addFileDimensions = async (
    target: string,
    filePath: string
  ): Promise<void> => {
    // sharp().metadata() returns raw pixel width/height (EXIF orientation
    // not applied) plus the tag itself. Values 5-8 are the 90°/270°
    // rotated cases where the "logical" width and height swap.
    const meta = await sharp(filePath).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    properties.dimensions = properties.dimensions ?? {};
    if ((meta.orientation ?? 0) >= 5) {
      properties.dimensions[target] = { width: height, height: width };
    } else {
      properties.dimensions[target] = { width, height };
    }
  };

  await addFileDimensions(DIR_ORIGINAL, sourcePath);
  await addFileDimensions(
    THUMBNAIL_TARGET.directory,
    path.join(rootDir, THUMBNAIL_TARGET.directory, id)
  );
  return properties;
};
