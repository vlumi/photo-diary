import path from "path";

import CONST from "../lib/constants.js";
import readExif from "./read-exif.js";
import setDimensions from "./set-dimensions.js";
import saveJson from "./save-json.js";

export default async (fileName, rootDir) => {
  const exif = await readExif(fileName, path.join(rootDir, CONST.DIR_INBOX));
  const properties = await setDimensions(fileName, rootDir, exif);
  await saveJson(fileName, rootDir, properties);
};
