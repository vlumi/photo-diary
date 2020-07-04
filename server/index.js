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

const routes = require('./routes')(app);

const PORT = process.env.PORT || 4200;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

