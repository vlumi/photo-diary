require("dotenv").config();
const CONST = require("./constants");
const DB_DRIVERS = require("./db/drivers");

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.use(express.static("build"));

const connectDb = () => {
  const dbDriver = process.env.DB_DRIVER;
  if (!dbDriver) {
    throw "The DB_DRIVER environment variable must be set.";
  }
  const dbOptions = process.env.DB_OPTS;
  return DB_DRIVERS[dbDriver](dbOptions);
};
const db = connectDb();

require("./session-filter")(app, db);
require("./logger")(app);
require("./routes")(app, db);

const PORT = process.env.PORT || CONST.DEFAULT_PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
