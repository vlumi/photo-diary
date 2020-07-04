const express = require("express");
const morgan = require("morgan");
const compression = require('compression');

const app = express();
const cors = require("cors");
app.use(compression());
app.use(express.json());
app.use(express.static("build"));
app.use(morgan("tiny"));

app.get("/api/stats", (req, res) => {
    // TODO: implement
});

app.get("/api/galleries", (req, res) => {
    // TODO: implement: list of galleries
    res.status(501).end();
});
app.post("/api/galleries", (req, res) => {
    // TODO: implement: create new gallery
    res.status(501).end();
});
app.get("/api/galleries/:galleryId", (req, res) => {
    // TODO: implement: list of photos in gallery, by year/month/day
    res.status(501).end();
});
app.put("/api/galleries/:galleryId", (req, res) => {
    // TODO: implement: update gallery meta
    res.status(501).end();
});
app.delete("/api/galleries/:galleryId", (req, res) => {
    // TODO: implement: delete gallery
    res.status(501).end();
});

app.post("/api/galleries/:galleryId", (req, res) => {
    // TODO: implement: add photo to gallery
    res.status(501).end();
});
app.get("/api/galleries/:galleryId/:photoId", (req, res) => {
    // TODO: implement: get photo meta, in gallery context
    res.status(501).end();
});
app.put("/api/galleries/:galleryId/:photoId", (req, res) => {
    // TODO: implement: update photo meta, in gallery context
    res.status(501).end();
});
app.delete("/api/galleries/:galleryId/:photoId", (req, res) => {
    // TODO: implement: remove photo from gallery
    res.status(501).end();
});

app.get("/api/photos/", (req, res) => {
    // TODO: implement: list all photos
    res.status(501).end();
});
app.post("/api/photos/", (req, res) => {
    // TODO: implement: create new photo
    res.status(501).end();
});
app.get("/api/photos/:photoId", (req, res) => {
    // TODO: implement: get photo meta
    res.status(501).end();
});
app.put("/api/photos/:photoId", (req, res) => {
    // TODO: implement: update photo meta
    res.status(501).end();
});
app.delete("/api/photos/:photoId", (req, res) => {
    // TODO: implement: delete photo, also removing from all galleries
    res.status(501).end();
});

app.use((request, response) => {
    response.status(404).send({ error: "unknown endpoint" });
});

const PORT = process.env.PORT || 4200;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

