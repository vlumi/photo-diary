-- Drop the redundant disp_width / disp_height columns from photo.
-- Aspect ratio is the same as orig_width / orig_height (sharp's
-- downscale preserves it within rounding), and aspect is the only
-- consumer of these columns post-#614: PhotoModel.ratio() flips to
-- read from dimensions.original. The display rendition's actual
-- pixel dimensions aren't needed anywhere — the Photo modal fits
-- the photo to its container, and the img tag's width/height attrs
-- come from the computed fit, not from the stored display size.
--
-- The new `photo_rendition` table (#615) will track which display-
-- ladder sizes exist per photo; per-rendition dimensions remain
-- unstored since each rendition is a uniform downscale (same
-- aspect, just a different bounding-square edge).
--
-- thumb_width / thumb_height stay — thumbnails are cropped to a
-- non-square box and the calendar tile renders them at native
-- pixel size, so the exact dimensions matter.

ALTER TABLE photo DROP COLUMN disp_width;
ALTER TABLE photo DROP COLUMN disp_height;

UPDATE meta SET value='27' WHERE key='schema_version';
