const CONST = require("./constants");

module.exports = (app, dao) => {

    registerStats(app, dao);
    registerGalleries(app, dao);
    registerPhotos(app, dao);
    registerGalleryPhotos(app, dao);

    app.use((request, response) => {
        response.status(404).send({ error: "unknown endpoint" });
    });
    app.use(function (error, req, res, next) {
        console.error(error);
        switch (error) {
            case CONST.ERROR_NOT_IMPLEMENTED:
            case CONST.ERROR_NOT_FOUND:
                res.status(501).send(error);
                break;
            default: res.status(500).send(`Error: ${error}`)
        }
    });
};

const registerStats = (app, dao) => {
    app.get("/api/stats", (req, res) =>
        dao.getStatistics(stats => res.json(stats))
    );
}
const registerGalleries = (app, dao) => {
    app.get("/api/galleries", (req, res) =>
        dao.getAllGalleries(galleries => res.json(galleries))
    );
    app.post("/api/galleries", (req, res) => {
        // TODO: validate and set content from req.body
        const gallery = {};
        res.json(dao.createGallery(gallery));
    });
    app.get("/api/galleries/:galleryId", (req, res) =>
        dao.getGallery(
            req.params.galleryId,
            data => res.json(data)
        ));
    app.put("/api/galleries/:galleryId", (req, res) => {
        // TODO: validate and set content from req.body
        const gallery = {};
        res.json(dao.updateGallery(gallery));
    });
    app.delete("/api/galleries/:galleryId", (req, res) => {
        dao.deleteGallery(req.params.galleryId);
        res.status(204).end();
    });
}
const registerPhotos = (app, dao) => {
    app.get("/api/photos/", (req, res) =>
        dao.getAllPhotos((photos) => res.json(photos))
    );
    app.post("/api/photos/", (req, res) => {
        // TODO: validate and set content from req.body
        const photo = {};
        res.json(dao.createPhoto(photo));
    });
    app.get("/api/photos/:photoId", (req, res) => {
        dao.getPhoto(req.params.photoId, (photo) => res.json(photo));
    });
    app.put("/api/photos/:photoId", (req, res) => {
        // TODO: implement: update photo meta
        res.status(501).end();
    });
    app.delete("/api/photos/:photoId", (req, res) => {
        dao.deletePhoto(req.params.galleryId);
        res.status(204).end();
    });
}
const registerGalleryPhotos = (app, dao) => {
    app.post("/api/galleries/:galleryId", (req, res) => {
        // TODO: validate and set content from req.body
        const photo = {};
        dao.linkPhoto(photo, gallery);
        res.status(204).end();
    });
    app.delete("/api/galleries/:galleryId/:photoId", (req, res) => {
        dao.unlinkPhoto(photo, gallery);
        res.status(204).end();
    });
}
