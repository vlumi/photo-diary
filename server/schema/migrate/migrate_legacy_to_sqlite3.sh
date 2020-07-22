#!bin/sh

OLD_DB=/path/to/old.sqlite3
# The target directory of the new DB
NEW_DIR=.
NEW_DB=newdb
# TODO: catch the directory of this script
SCHEMA_DIR=.

(cat $SCHEMA_DIR/sqlite3.ddl ; \
 cat $SCHEMA_DIR/dump_legacy_sqlite3_to_sqlite3.sql \
     | sqlite3 $OLD_DB \
     | perl $SCHEMA_DIR/transform_legacy_sqlite3_to_sqlite.pl ; \
 echo "insert into acl values (':guest',':public',1);" ; \
  \
 | sqlite3 $NEW_DIR/newdb_tmp.sqlite3 \
 && mv $NEW_DIR/$NEW_DB\_tmp.sqlite3 $NEW_DIR/$NEW_DB.sqlite3
