import readExif from "./read-exif.js";
import setDimensions from "./set-dimensions.js";

export default async (
  sourcePath: string,
  id: string,
  rootDir: string
): Promise<Record<string, unknown>> => {
  const exif = await readExif(sourcePath, id);
  return await setDimensions(sourcePath, id, rootDir, exif);
};
