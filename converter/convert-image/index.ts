import gm from "gm";
import path from "node:path";
import fs from "node:fs";

import { DIR_INBOX, type Target } from "../lib/constants.js";
import * as logger from "../lib/logger.js";

const im = gm.subClass({ imageMagick: true });

export default (fileName: string, root: string, target: Target): Promise<void> => {
  return new Promise((resolve, reject) => {
    const inputPath = path.join(root, DIR_INBOX, fileName);
    const outputPath = path.join(root, target.directory, fileName);

    const width = target.dimensions.width;
    const height = target.dimensions.height;
    logger.debug(`[${fileName}] Resizing to ${width}x${height}`);

    im(inputPath)
      .autoOrient()
      .resize(width, height)
      .write(outputPath, async (err) => {
        if (err) {
          reject(err);
        } else {
          await fs.promises.chmod(outputPath, 0o644);
          resolve();
        }
      });
  });
};
