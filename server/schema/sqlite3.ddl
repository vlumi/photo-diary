CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
INSERT INTO meta (key, value) VALUES ('schema_version', '1');
INSERT INTO meta (key, value) VALUES ('instance_name', '');
INSERT INTO meta (key, value) VALUES ('instance_description', '');
INSERT INTO meta (key, value) VALUES ('instance_cdn', '');
INSERT INTO meta (key, value) VALUES ('instance_image', '');

CREATE TABLE user (
  id TEXT PRIMARY KEY,
  password TEXT,
  secret TEXT
);
CREATE TABLE acl (
  user_id TEXT,
  gallery_id TEXT,
  level INTEGER,
  PRIMARY KEY(user_id, gallery_id)
);
CREATE TABLE gallery (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  icon TEXT,
  epoch TEXT,
  epoch_type TEXT,
  theme TEXT,
  initial_view TEXT,
  hostname TEXT
);
CREATE TABLE photo (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  author TEXT,
  taken TEXT,
  country_code TEXT,
  place TEXT,
  coord_lat REAL,
  coord_lon REAL,
  coord_alt REAL,
  camera_make TEXT,
  camera_model TEXT,
  camera_serial TEXT,
  lens_make TEXT,
  lens_model TEXT,
  lens_serial TEXT,
  focal REAL,
  fstop REAL,
  exposure_time REAL,
  iso INTEGER,
  orig_width INTEGER,
  orig_height INTEGER,
  disp_width INTEGER,
  disp_height INTEGER,
  thumb_width INTEGER,
  thumb_height INTEGER
);
CREATE TABLE gallery_photo (
  gallery_id TEXT,
  photo_id TEXT,
  PRIMARY KEY(photo_id, gallery_id),
  FOREIGN KEY(photo_id) REFERENCES photos(id),
  FOREIGN KEY(gallery_id) REFERENCES galleries(id)
);