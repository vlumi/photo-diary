import "dotenv/config";
import path from "node:path";
import chokidar from "chokidar";

import { DIR_INBOX } from "./lib/constants.js";
import { getDirectory } from "./lib/config.js";
import * as logger from "./lib/logger.js";
import processFile from "./process-file.js";

try {
  const rootDir = getDirectory();
  const watchDir = path.join(rootDir, DIR_INBOX);
  logger.info(`Watching ${watchDir}`);

  // chokidar v4 dropped glob-pattern support. Inline filter:
  //   - .jpg / .jpeg → SOOC intake (image pipeline).
  //   - .json → user-supplied metadata sidecar (lookup-or-create).
  // Subdir convention: files at `inbox/<gallery>/...` get auto-linked
  // to that gallery on intake; files at the root don't auto-link.
  // `._*` are macOS AppleDouble sidecars (created when copying to
  // non-HFS volumes); they're never real intake.
  const isAcceptable = (filePath: string) => {
    const name = path.basename(filePath);
    return !name.startsWith("._") && /\.(jpe?g|json)$/i.test(name);
  };
  const watcher = chokidar.watch(watchDir, {
    persistent: true,
    ignoreInitial: false,
    followSymlinks: false,
    awaitWriteFinish: true,
    atomic: true,
    ignored: (filePath, stats) =>
      stats !== undefined && stats.isFile() && !isAcceptable(filePath),
  });

  const fileQueue: string[] = [];
  const fileQueueProcessor = (): void => {
    const relPath = fileQueue.shift();
    if (relPath) {
      processFile(relPath, rootDir)
        .catch((err) => {
          logger.error("Processing failed for file", relPath, err);
        })
        .finally(() => setTimeout(fileQueueProcessor, 0));
    } else {
      setTimeout(fileQueueProcessor, 1000);
    }
  };
  setTimeout(fileQueueProcessor, 1000);

  // Dedupe queue by relative path so subdir layout is preserved
  // (`dailybw/IMG_1234.jpg` and `gallery/IMG_1234.jpg` are different
  // intake events).
  const enqueueIfNew = (absPath: string) => {
    const relPath = path.relative(watchDir, absPath);
    if (!fileQueue.includes(relPath)) {
      fileQueue.push(relPath);
    }
  };

  watcher
    .on("add", enqueueIfNew)
    .on("change", enqueueIfNew)
    .on("unlink", (absPath) =>
      logger.debug(`[${path.relative(watchDir, absPath)}] Removed from inbox`)
    )
    .on("error", (err) => logger.error("Error:", err));
} catch (err) {
  console.error(err);
}
