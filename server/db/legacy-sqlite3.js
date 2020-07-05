const CONST = require("../constants");

const sqlite3 = require('sqlite3').verbose();

module.exports = (opts) => {
    if (!opts) {
        throw "The path to the SQLite3 database must be set to DB_OPTS.";
    }
    const db = new sqlite3.Database(opts);
    return {
        loadGalleries: (onSuccess, onError) => {
            db.all("SELECT * FROM gallery", function (err, rows) {
                if (err) {
                    onError(err);
                } else {
                    onSuccess(rows.map(row => mapGalleryRow(row)));
                }
            });
        },
        loadGallery: (gallery, onSuccess, onError) => {
            db.all("SELECT * FROM gallery WHERE name = ?", gallery, function (err, rows) {
                if (err) {
                    onError(err);
                } else {
                    if (rows.length != 1) {
                        onError("Gallery not found.")
                    } else {
                        onSuccess(mapGalleryRow(rows[0]));
                    }
                }
            });
        },
        loadGalleryPhotos: (gallery, onSuccess, onError) => {
            const query = "SELECT photo.*" +
                " FROM photo" +
                " JOIN photo_gallery ON photo.name=photo_gallery.photo_name" +
                " WHERE photo_gallery.gallery_name = ?";
            db.all(query, gallery, function (err, rows) {
                if (err) {
                    onError(err);
                } else {
                    onSuccess(rows.map(row => mapPhotoRow(row)));
                }
            });
        },
        loadPhotos: (onSuccess, onError) => {
            db.all("SELECT * FROM photo", function (err, rows) {
                if (err) {
                    onError(err);
                } else {
                    onSuccess(rows.map(row => mapPhotoRow(row)));
                }
            });
        },
        loadPhoto: (photo, onSuccess, onError) => {
            db.all("SELECT * FROM photo WHERE name = ?", photo, function (err, rows) {
                if (err) {
                    onError(err);
                } else {
                    if (rows.length != 1) {
                        onError("Photo not found.")
                    } else {
                        onSuccess(mapPhotoRow(rows[0]));
                    }
                }
            });
        },
    };
};

const toString = (str) => {
    if (str !== null && str !== undefined) {
        return str.toString();
    }
    return "";
}
const mapGalleryRow = (row) => {
    // console.log(row);
    return {
        id: toString(row.name),
        title: toString(row.title),
        description: toString(row.description),
        epoch: toString(row.epoch),
    }
};
const mapPhotoRow = (row) => {
    // console.log(row);
    const taken = new Date(toString(row.taken).substring(0, 19));
    const year = 0 + taken.getFullYear();
    const month = taken.getMonth() + 1;
    const day = taken.getDate();
    const hour = taken.getHours();
    const minute = taken.getMinutes();
    const second = taken.getSeconds();

    return {
        id: toString(row.name),
        title: toString(row.title),
        description: toString(row.description),
        taken: {
            timestamp: toString(row.taken),
            year: year,
            month: month,
            day: day,
            hour: hour,
            minute: minute,
            second: second,
            country: toString(row.country),
            place: toString(row.place),
            author: toString(row.author),
        },
        camera: {
            make: toString(row.camera), // TODO: split?
            model: undefined,
            serial: undefined,
        },
        lens: {
            make: undefined,
            model: undefined,
            serial: undefined,
        },
        exposure: {
            focalLength: toString(row.focal),
            // focalLength35mmEquiv: 41,
            aperture: toString(row.fstop),
            shutterSpeed: toString(row.shutter),
            iso: toString(row.iso),
        },
        size: {
            original: {
                width: toString(row.f_width),
                height: toString(row.f_height),
            },
            display: {
                width: toString(row.width),
                height: toString(row.height),
            },
            thumbnail: {
                width: toString(row.t_width),
                height: toString(row.t_height),
            },
        },
    }
};
