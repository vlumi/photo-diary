module.exports = {
    DEFAULT_PORT: 4200,

    DB_DRIVER: {
        dummy: require("./db/dummy"),
        legacy_sqlite3: require("./db/legacy-sqlite3"),
    },

    ERROR_NOT_IMPLEMENTED: "Not implemented",
    ERROR_NOT_FOUND: "Not found",

    STATS_UNKNOWN: "unknown",
};