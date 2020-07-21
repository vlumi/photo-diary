const DEBUG = process.env.DEBUG || false;

const ENV_ROOT = "ROOT";
const WATCH_GLOB = "*.jp?(e)g";

const DIR_INBOX = "inbox";
const DIR_ORIGINAL = "original";
const DIR_DISPLAY = "display";
const DIR_THUMBNAIL = "thumbnail";

const DIM_DISPLAY = { width: 1500, height: 1500 };
const DIM_THUMBNAIL = { width: 600, height: 200 };

const TARGETS = [
  {
    directory: DIR_DISPLAY,
    dimensions: DIM_DISPLAY,
  },
  {
    directory: DIR_THUMBNAIL,
    dimensions: DIM_THUMBNAIL,
  },
];

module.exports = {
  DEBUG,

  ENV_ROOT,
  WATCH_GLOB,

  DIR_INBOX,
  DIR_ORIGINAL,
  DIR_DISPLAY,
  DIR_THUMBNAIL,

  DIM_DISPLAY,
  DIM_THUMBNAIL,

  TARGETS,
};
