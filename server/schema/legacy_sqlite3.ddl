CREATE TABLE schema_info (version INTEGER PRIMARY KEY);

INSERT INTO schema_info (version)
VALUES (2);

CREATE TABLE gallery (
  name TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  epoch TEXT
);

CREATE TABLE photo (
  name TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  taken TEXT,
  country TEXT,
  place TEXT,
  author TEXT,
  camera TEXT,
  focal INTEGER,
  fstop TEXT,
  shutter TEXT,
  iso INTEGER,
  width INTEGER,
  height INTEGER,
  t_width INTEGER,
  t_height INTEGER,
  f_width INTEGER,
  f_height INTEGER
);

CREATE TABLE photo_gallery (
  photo_name TEXT,
  gallery_name TEXT,
  PRIMARY KEY(photo_name, gallery_name),
  FOREIGN KEY(photo_name) REFERENCES photos(name),
  FOREIGN KEY(gallery_name) REFERENCES galleries(name)
);