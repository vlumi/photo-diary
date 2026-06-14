import path from "node:path";

export const DEBUG = Boolean(process.env.DEBUG);

// Fixed by convention: photos live in a `photos/` subdirectory of the
// instance directory (the converter's CWD when launched via start-prod.sh).
// If you need photos on a different disk, symlink either the photos
// subdirectory or the whole instance dir.
export const PHOTO_ROOT_DIR = path.join(process.cwd(), "photos");

export const DIR_INBOX = "inbox";
export const DIR_ORIGINAL = "original";
export const DIR_DISPLAY = "display";
export const DIR_THUMBNAIL = "thumbnail";

export const DIM_DISPLAY = { width: 1500, height: 1500 };
export const DIM_THUMBNAIL = { width: 600, height: 200 };

export type Target = {
  directory: string;
  dimensions: { width: number; height: number };
  kind: "display" | "thumbnail";
};

export const TARGETS: Target[] = [
  {
    directory: DIR_DISPLAY,
    dimensions: DIM_DISPLAY,
    kind: "display",
  },
  {
    directory: DIR_THUMBNAIL,
    dimensions: DIM_THUMBNAIL,
    kind: "thumbnail",
  },
];
