const CONST = require("./constants");

const express = require("express");
const morgan = require("morgan");
const compression = require('compression');
const cors = require("cors");

const app = express();
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static("build"));
app.use(morgan("tiny"));


const dbDriver = process.env.DB_DRIVER;
if (!dbDriver) {
    throw "The DB_DRIVER environment variable must be set.";
}
const dbOptions = process.env.DB_OPTS;
const db = CONST.DB_DRIVER[dbDriver](dbOptions);
const dao = require('./dao')(db);
const routes = require('./routes')(app, dao);

const PORT = process.env.PORT || CONST.DEFAULT_PORT;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

