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
});
app.post("/api/galleries", (req, res) => {
    // TODO: implement: create new gallery
});
app.get("/api/galleries/:galleryId", (req, res) => {
    // TODO: implement: list of photos in gallery, by year/month/day
});
app.put("/api/galleries/:galleryId", (req, res) => {
    // TODO: implement: update gallery meta
});
app.delete("/api/galleries/:galleryId", (req, res) => {
    // TODO: implement: delete gallery
});

app.post("/api/galleries/:galleryId", (req, res) => {
    // TODO: implement: add photo to gallery
});
app.get("/api/galleries/:galleryId/:photoId", (req, res) => {
    // TODO: implement: get photo meta, in gallery context
});
app.put("/api/galleries/:galleryId/:photoId", (req, res) => {
    // TODO: implement: update photo meta, in gallery context
});
app.delete("/api/galleries/:galleryId/:photoId", (req, res) => {
    // TODO: implement: remove photo from gallery
});

app.get("/api/photos/", (req, res) => {
    // TODO: implement: list all photos
});
app.post("/api/photos/", (req, res) => {
    // TODO: implement: create new photo
});
app.get("/api/photos/:photoId", (req, res) => {
    // TODO: implement: get photo meta
});
app.put("/api/photos/:photoId", (req, res) => {
    // TODO: implement: update photo meta
});
app.delete("/api/photos/:photoId", (req, res) => {
    // TODO: implement: delete photo, also removing from all galleries
});

app.use((request, response) => {
    response.status(404).send({ error: "unknown endpoint" });
});

const PORT = process.env.PORT || 4200;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

