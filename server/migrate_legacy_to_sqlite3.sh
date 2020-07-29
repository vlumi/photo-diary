#!bin/sh

OLD_DB="gallery.sqlite3"
# The target directory of the new DB
NEW_DIR=.
# Name of the target DB -- expected to be empty
NEW_DB=newdb
# TODO: catch the directory of this script
SCHEMA_DIR="schema"

(
    cat "$SCHEMA_DIR/sqlite3.ddl"
    cat "$SCHEMA_DIR/migrate/dump_legacy_sqlite3_to_sqlite3.sql" |
        sqlite3 "$OLD_DB" |
        perl "$SCHEMA_DIR/migrate/transform_legacy_sqlite3_to_sqlite.pl"
    echo "INSERT INTO acl VALUES (':guest',':public',1);"
    echo "UPDATE photo SET taken=substr(taken, 0, 20);"
) |
    sqlite3 "$NEW_DIR/newdb_tmp.sqlite3" &&
    mv "$NEW_DIR/$NEW_DB\_tmp.sqlite3" "$NEW_DIR/$NEW_DB.sqlite3"
