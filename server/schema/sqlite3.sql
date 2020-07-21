CREATE TABLE schema_info (version INTEGER PRIMARY KEY);
INSERT INTO schema_info (version)
VALUES (3);
CREATE TABLE gallery (
  -- change name
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  epoch TEXT,
  -- new, TBD
  epoch_type TEXT,
  -- new
  theme TEXT
);
CREATE TABLE photo (
  -- change name
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  taken TEXT,
  country TEXT,
  -- new
  coord_alt REAL,
  -- new
  coord_lat REAL,
  -- new
  coord_lon REAL,
  place TEXT,
  author TEXT,
  -- new
  camera_make TEXT,
  camera_model TEXT,
  -- new
  camera_serial TEXT,
  -- new
  lens_make TEXT,
  -- new
  lens_model TEXT,
  -- new
  lens_serial TEXT,
  -- change type
  focal REAL,
  -- change type
  fstop REAL,
  -- change format, type
  exposureTime REAL,
  iso INTEGER,
  -- change name
  disp_width INTEGER,
  -- change name
  disp_height INTEGER,
  -- change name
  thumb_width INTEGER,
  -- change name
  thumb_height INTEGER,
  -- change name
  orig_width INTEGER,
  -- change name
  orig_height INTEGER
);
CREATE TABLE photo_gallery (
  photo_name TEXT,
  gallery_name TEXT,
  PRIMARY KEY(photo_name, gallery_name),
  FOREIGN KEY(photo_name) REFERENCES photos(name),
  FOREIGN KEY(gallery_name) REFERENCES galleries(name)
);