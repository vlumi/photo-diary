CREATE TABLE schema_info (version INTEGER PRIMARY KEY);

INSERT INTO schema_info (version)
VALUES (3);

-- new
CREATE TABLE user (id TEXT, PASSWORD TEXT, secret TEXT);

-- new
CREATE TABLE acl (
  user_id TEXT PRIMARY KEY,
  gallery_id TEXT,
  level INTEGER,
  UNIQUE(user_id, gallery_id)
);

CREATE TABLE gallery (
  -- change name
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  epoch TEXT,
  -- new, TBD
  epoch_type TEXT,
  -- new
  theme TEXT,
  -- new
  initial_view TEXT
);

CREATE TABLE photo (
  -- change name
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  author TEXT,
  --
  taken TEXT,
  -- change name
  country_code TEXT,
  place TEXT,
  -- new
  coord_lat REAL,
  -- new
  coord_lon REAL,
  -- new
  coord_alt REAL,
  -- gear
  -- new
  camera_make TEXT,
  -- change name
  camera_model TEXT,
  -- new
  camera_serial TEXT,
  -- new
  lens_make TEXT,
  -- new
  lens_model TEXT,
  -- new
  lens_serial TEXT,
  -- exposure
  -- change type
  focal REAL,
  -- change type
  fstop REAL,
  -- change format, type
  exposure_time REAL,
  iso INTEGER,
  -- dimensions
  -- change name
  orig_width INTEGER,
  -- change name
  orig_height INTEGER,
  -- change name
  disp_width INTEGER,
  -- change name
  disp_height INTEGER,
  -- change name
  thumb_width INTEGER,
  -- change name
  thumb_height INTEGER
);

-- change name
CREATE TABLE gallery_photo (
  -- change name
  gallery_id TEXT,
  -- change name
  photo_id TEXT,
  PRIMARY KEY(photo_id, gallery_id),
  FOREIGN KEY(photo_id) REFERENCES photos(id),
  FOREIGN KEY(gallery_id) REFERENCES galleries(id)
);