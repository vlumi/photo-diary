#!/usr/bin/env node
const { argv } = require("yargs")
  .usage("Usage: $0 [options] [JSON-files]")
  .nargs("gallery", 1)
  .describe("gallery", "Set to gallery, repeat for multiple")
  .group(["title", "description", "country"], "Properties")
  .nargs("title", 1)
  .describe("title", "Title")
  .nargs("description", 1)
  .describe("description", "Description")
  .nargs("country", 1)
  .describe("country", "Two-letter country code (ISO 3166-1 alpha-2)")
  .group(
    [
      "author",
      "place",
      "camera-make",
      "camera-model",
      "lens-make",
      "lens-model",
      "focal",
      "aperture",
    ],
    "Overrides"
  )
  .nargs("author", 1)
  .describe("author", "Author")
  .nargs("place", 1)
  .describe("place", "Free-form place description")
  .nargs("camera-make", 1)
  .describe("camera-make", "Camera make")
  .nargs("camera-model", 1)
  .describe("camera-model", "Camera model")
  .nargs("lens-make", 1)
  .describe("lens-make", "Lens make")
  .nargs("lens-model", 1)
  .describe("lens-model", "Lens model")
  .nargs("focal", 1)
  .describe("focal", "Focal length")
  .nargs("aperture", 1)
  .describe("aperture", "Aperture value (f-number)")
  .demand(1);

const fs = require("fs");

const logger = require("../utils/logger");
const db = require("../db");

const addToGalleries = (photoId, galleries) => {
  if (!galleries) {
    return;
  }
  if (typeof galleries === "string") {
    return addToGalleries(photoId, [galleries]);
  }
  logger.debug(
    `Add photo "${photoId}" to galleries: ${galleries
      .map((gallery) => `"${gallery}"`)
      .join(", ")}`
  );
  db.unlinkAllGalleries(photoId)
    .then(() => {
      db.linkGalleryPhoto(galleries, [photoId])
        .then(() => {
          logger.info(
            `Photo "${photoId}" linked to galleries  ${galleries
              .map((gallery) => `"${gallery}"`)
              .join(", ")}`
          );
        })
        .catch((error) =>
          logger.error(
            `Linking photo "${photoId}" to galleries  ${galleries
              .map((gallery) => `"${gallery}"`)
              .join(", ")} failed:`,
            error
          )
        );
    })
    .catch((error) =>
      logger.error(
        `Unlinking photo "${photoId}" from existing galleries failed:`,
        error
      )
    );
};

const createPhoto = (photo) => {
  logger.debug(`Photo "${photo.id}" not yet in DB, creating`);
  db.createPhoto(photo)
    .then(() => {
      logger.info(`Created "${photo.id}"`);
      addToGalleries(photo.id, argv.gallery);
    })
    .catch((error) => {
      logger.error(`Creating "${photo.id}" failed:`, error);
    });
};

const updatePhoto = (photo) => {
  const id = photo.id;
  delete photo.id;
  logger.debug(`Photo "${id}" already in DB, updating`);
  db.updatePhoto(id, photo)
    .then(() => {
      logger.info(`Updated "${id}"`);
      addToGalleries(photo.id, argv.gallery);
    })
    .catch((error) => {
      logger.error(`Update of "${id}" failed:`, error);
    });
};

const processPhoto = (photo) => {
  if (photo.id) {
    if ("title" in argv) photo.title = argv.title;
    if ("description" in argv) photo.title = argv.description;
    if ("author" in argv) photo.taken.author = argv.author;
    if ("country" in argv) photo.taken.location.country = argv.country;
    if ("place" in argv) photo.taken.location.place = argv.place;
    if ("camera-make" in argv) photo.camera.make = argv["camera-make"];
    if ("camera-model" in argv) photo.camera.model = argv["camera-model"];
    if ("lens-make" in argv) photo.lens.make = argv["lens-make"];
    if ("lens-model" in argv) photo.lens.model = argv["lens-model"];
    if ("focal" in argv) photo.exposure.focalLength = argv.focal;
    if ("aperture" in argv) photo.exposure.aperture = argv.aperture;

    db.loadPhoto(photo.id)
      .then(() => updatePhoto(photo))
      .catch(() => createPhoto(photo));
  }
};

argv._.forEach(async (filePath) => {
  logger.debug(`Processing "${filePath}"`);
  try {
    const json = await fs.promises.readFile(filePath, { encoding: "utf-8" });
    const data = JSON.parse(json);
    if (Array.isArray(data)) {
      data.forEach((photo) => {
        processPhoto(photo);
      });
    } else if (!("id" in data)) {
      Object.values(data).forEach((photo) => {
        processPhoto(photo);
      });
    } else {
      processPhoto(data);
    }
  } catch (error) {
    logger.error("Failed:", error);
  }
});
