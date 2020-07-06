const DB_DRIVER = {
  dummy: require("./dummy"),
  legacy_sqlite3: require("./legacy-sqlite3"),
};

module.exports = DB_DRIVER;
