DROP TABLE schema_info;

CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
INSERT INTO meta (key, value) VALUES ('schema_version', '1');
INSERT INTO meta (key, value) VALUES ('instance_name', '');
INSERT INTO meta (key, value) VALUES ('instance_description', '');
INSERT INTO meta (key, value) VALUES ('instance_cdn', '');
INSERT INTO meta (key, value) VALUES ('instance_image', '');
