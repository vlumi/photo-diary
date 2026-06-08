import "dotenv/config";

const DEBUG = false;
const DB_DRIVER = process.env.DB_DRIVER ?? "sqlite3";
const DB_OPTS = process.env.DB_OPTS ?? ":memory:";

export default { DEBUG, DB_DRIVER, DB_OPTS };
