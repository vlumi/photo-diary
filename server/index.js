const CONST = require("./constants");
const DB_DRIVERS = require("./db/drivers");

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.use(express.static("build"));
app.use(morgan("tiny"));

const dbDriver = process.env.DB_DRIVER;
if (!dbDriver) {
  throw "The DB_DRIVER environment variable must be set.";
}
const dbOptions = process.env.DB_OPTS;
const db = DB_DRIVERS[dbDriver](dbOptions);
const dao = require("./dao")(db);
const routes = require("./routes")(app, dao);

const PORT = process.env.PORT || CONST.DEFAULT_PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
