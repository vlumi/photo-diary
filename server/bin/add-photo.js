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
  .describe("aperture", "Aperture value (f-number)");

const fs = require("fs");

const logger = require("../utils/logger");
const db = require("../db");

if (process.argv.length < 3) {
  logger.error("Usage: node bin/add-photo.js [photo.json] ...");
  process.exit();
}

const addToGalleries = (photo, galleries) => {
  if (!galleries) {
    return;
  }
  if (typeof galleries === "string") {
    return addToGalleries(photo, [galleries]);
  }
  logger.debug(
    `Add photo "${photo.id}" to galleries: ${galleries
      .map((gallery) => `"${gallery}"`)
      .join(", ")}`
  );
  // TODO: implement
  db.unlinkAllGalleries(photo.id)
    .then(() => {
      db.linkGalleryPhoto(galleries, [photo.id])
        .then(() => {
          logger.info(
            `Photo "${photo.id}" linked to galleries  ${galleries
              .map((gallery) => `"${gallery}"`)
              .join(", ")}`
          );
        })
        .catch((error) =>
          logger.error(
            `Linking photo "${photo.id}" to galleries  ${galleries
              .map((gallery) => `"${gallery}"`)
              .join(", ")} failed:`,
            error
          )
        );
    })
    .catch((error) =>
      logger.error(
        `Unlinking photo "${photo.id}" from existing galleries failed:`,
        error
      )
    );
};

const createPhoto = (photo) => {
  logger.debug(`Photo "${photo.id}" not yet in DB, creating`);
  db.createPhoto(photo)
    .then(() => {
      logger.info(`Created "${photo.id}"`);
      addToGalleries(photo, argv.gallery);
    })
    .catch((error) => {
      logger.error(`Creating "${photo.id}" failed:`, error);
    });
};

const updatePhoto = (photo) => {
  logger.debug(`Photo "${photo.id}" already in DB, updating`);
  db.updatePhoto(photo.id, photo)
    .then(() => {
      logger.info(`Updated "${photo.id}"`);
      addToGalleries(photo, argv.gallery);
    })
    .catch((error) => {
      logger.error(`Update of "${photo.id}" failed:`, error);
    });
};

argv._.forEach(async (filePath) => {
  logger.debug(`Processing "${filePath}"`);
  try {
    const json = await fs.promises.readFile(filePath, { encoding: "utf-8" });
    const data = JSON.parse(json);
    Object.values(data).forEach((photo) => {
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
    });
  } catch (error) {
    logger.error("Failed:", error);
  }
});