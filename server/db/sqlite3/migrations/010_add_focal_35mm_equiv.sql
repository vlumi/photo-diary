-- 35mm-equivalent focal length. Schema-only; backfill of existing
-- rows is an operator step (crop-factor × focal per body).

ALTER TABLE photo ADD COLUMN focal_35mm_equiv REAL;

UPDATE meta SET value='10' WHERE key='schema_version';
