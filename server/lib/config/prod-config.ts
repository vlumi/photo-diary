import "dotenv/config";
import path from "node:path";

import CONST from "../constants.js";

const DEBUG = process.env.DEBUG || CONST.DEFAULT_DEBUG;
const DB_DRIVER = process.env.DB_DRIVER;
// SQLite DB lives in the instance dir (current working directory) by
// convention: `<cwd>/db.sqlite3`. Symlink the file or the whole instance
// dir if you need the DB on a different disk.
const DB_OPTS =
  DB_DRIVER === "sqlite3" ? path.join(process.cwd(), "db.sqlite3") : undefined;

export default { DEBUG, DB_DRIVER, DB_OPTS };
