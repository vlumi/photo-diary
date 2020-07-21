SELECT
    'INSERT INTO gallery(id, title, description, epoch) VALUES(' || quote(name) || ', ' || quote(title) || ', ' || quote(description) || ', ' || quote(epoch) || ');'
FROM
    gallery;

SELECT
    'INSERT INTO photo (id, title, description, author,'
    || ' taken, country_code, place, camera_model,' 
    || ' focal, fstop, exposure_time, iso,'
    || ' orig_width, orig_height, disp_width, disp_height, thumb_width, thumb_height'
    || ') VALUES ('
    || quote(name)|| ', '
    || quote(title) || ', '
    || quote(description) || ', '
    || quote(author) || ', '
    || '''' || taken ||''', '
    || quote(country) || ', '
    || quote(place) || ', '
    || '''' || camera ||''', '
    || ifnull(nullif(focal, 0), 'NULL') || ', '
    || ifnull(nullif(fstop, ''), 'NULL') || ', '
    || 'EVAL_SHUTTER{' || shutter || '}, '
    || iso || ', '
    || f_width || ', '
    || f_height || ', '
    || width || ', '
    || height || ', '
    || t_width || ', '
    || t_height
    || ');'
from
    photo;

SELECT
    'INSERT INTO gallery_photo(gallery_id, photo_id) VALUES(' || quote(gallery_name) || ',' || quote(photo_name) || ');'
FROM
    photo_gallery;