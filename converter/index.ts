import "dotenv/config";
import path from "node:path";
import chokidar from "chokidar";

import { DIR_INBOX } from "./lib/constants.js";
import { getDirectory } from "./lib/config.js";
import * as logger from "./lib/logger.js";
import processFile from "./process-file.js";

// Operation-event retention. The converter owns pruning because
// it's the always-on producer — a server-only deploy would still
// run it via the same process.
const OPERATION_EVENT_RETENTION_DAYS = 90;
const OPERATION_EVENT_PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;

const pruneOldOperationEvents = async (): Promise<void> => {
  try {
    const { default: db } = await import("photo-diary-server/db/index.js");
    const cutoff = new Date(
      Date.now() - OPERATION_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const removed = await db.pruneOperationsBefore(cutoff);
    if (removed > 0) {
      logger.info(`Pruned ${removed} operation_event rows older than ${cutoff}`);
    }
  } catch (err) {
    logger.error("Failed to prune operation_event rows:", err);
  }
};

try {
  const rootDir = getDirectory();
  const watchDir = path.join(rootDir, DIR_INBOX);
  logger.info(`Watching ${watchDir}`);

  void pruneOldOperationEvents();
  setInterval(
    () => void pruneOldOperationEvents(),
    OPERATION_EVENT_PRUNE_INTERVAL_MS
  );

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
        .catch(async (err) => {
          logger.error("Processing failed for file", relPath, err);
          try {
            const { default: db } = await import(
              "photo-diary-server/db/index.js"
            );
            await db.logOperation({
              photoId: null,
              action: "intake",
              status: "failure",
              detail: `${relPath}: ${(err as Error).message ?? String(err)}`,
            });
          } catch {
            // Best-effort: a DB write failure here mustn't kill the queue.
          }
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
