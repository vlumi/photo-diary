import path from "node:path";

import { DIR_INBOX } from "../lib/constants.js";
import readExif from "./read-exif.js";
import setDimensions from "./set-dimensions.js";
import saveJson from "./save-json.js";

export default async (
  fileName: string,
  rootDir: string
): Promise<Record<string, unknown>> => {
  const exif = await readExif(fileName, path.join(rootDir, DIR_INBOX));
  const properties = await setDimensions(fileName, rootDir, exif);
  await saveJson(fileName, rootDir, properties);
  return properties;
};
