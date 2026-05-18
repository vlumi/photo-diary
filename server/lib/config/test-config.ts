import { config as dotenvConfig } from "dotenv";
dotenvConfig({ quiet: true });

const DEBUG = false;
const DB_DRIVER = "dummy";
const DB_OPTS = "dummy";

export default { DEBUG, DB_DRIVER, DB_OPTS };
