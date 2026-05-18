import fs from "node:fs";
import path from "node:path";

import { DIR_INBOX } from "../lib/constants.js";
import * as logger from "../lib/logger.js";

export default (
  fileName: string,
  rootDir: string,
  properties: unknown
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const inboxFilePath = path.join(rootDir, DIR_INBOX, fileName);
    const jsonFileName = `${inboxFilePath}.json`;

    fs.writeFile(
      jsonFileName,
      JSON.stringify({ [fileName]: properties }),
      "utf8",
      (err) => {
        if (err) {
          reject(err);
        } else {
          logger.debug(`[${fileName}] Dumped exif to ${jsonFileName}`);
          resolve();
        }
      }
    );
  });
};
