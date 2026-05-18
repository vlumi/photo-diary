export const DEBUG = Boolean(process.env.DEBUG);

export const PHOTO_ROOT_DIR = process.env.PHOTO_ROOT_DIR;

export const DIR_INBOX = "inbox";
export const DIR_ORIGINAL = "original";
export const DIR_DISPLAY = "display";
export const DIR_THUMBNAIL = "thumbnail";

export const DIM_DISPLAY = { width: 1500, height: 1500 };
export const DIM_THUMBNAIL = { width: 600, height: 200 };

export type Target = {
  directory: string;
  dimensions: { width: number; height: number };
};

export const TARGETS: Target[] = [
  {
    directory: DIR_DISPLAY,
    dimensions: DIM_DISPLAY,
  },
  {
    directory: DIR_THUMBNAIL,
    dimensions: DIM_THUMBNAIL,
  },
];
