require("dotenv").config();
const CONST = require("./utils/constants");

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


require("./session-filter")(app);
require("./utils/logger")(app);
require("./routes")(app);

const PORT = process.env.PORT || CONST.DEFAULT_PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
