import gm from "gm";
import path from "path";
import fs from "fs";

import CONST from "../lib/constants.js";
import logger from "../lib/logger.js";

const im = gm.subClass({ imageMagick: true });

export default (fileName, root, target) => {
  return new Promise((resolve, reject) => {
    const inputPath = path.join(root, CONST.DIR_INBOX, fileName);
    const outputPath = path.join(root, target.directory, fileName);

    const width = target.dimensions.width;
    const height = target.dimensions.height;
    logger.debug(`[${fileName}] Resizing to ${width}x${height}`);

    im(inputPath)
      .autoOrient()
      .resize(width, height)
      .write(outputPath, async (error) => {
        if (error) {
          reject(error);
        } else {
          await fs.promises.chmod(outputPath, "0644");
          resolve();
        }
      });
  });
};
