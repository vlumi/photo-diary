import path from "node:path";
import { imageSizeFromFile } from "image-size/fromFile";

import { DIR_ORIGINAL, TARGETS } from "../lib/constants.js";

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
    const dims = await imageSizeFromFile(filePath);
    properties.dimensions = properties.dimensions ?? {};
    if ((dims.orientation ?? 0) >= 5) {
      // Vertical
      properties.dimensions[target] = { width: dims.height, height: dims.width };
    } else {
      // Horizontal
      properties.dimensions[target] = { width: dims.width, height: dims.height };
    }
  };

  await addFileDimensions(DIR_ORIGINAL, sourcePath);
  for (const target of TARGETS) {
    await addFileDimensions(
      target.directory,
      path.join(rootDir, target.directory, id)
    );
  }
  return properties;
};
