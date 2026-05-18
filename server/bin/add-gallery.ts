#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import logger from "../lib/logger.js";
import db from "../db/index.js";

const argv = yargs(hideBin(process.argv))
  .nargs("id", 1)
  .describe("id", "ID")
  .nargs("title", 1)
  .describe("title", "Title")
  .nargs("description", 1)
  .describe("description", "Description")
  .nargs("epoch", 1)
  .describe("epoch", "Epoch date")
  .nargs("epoch_type", 1)
  .describe("epoch_type", "Type of the epoch")
  .nargs("theme", 1)
  .describe("theme", "Theme")
  .nargs("initial_view", 1)
  .describe(
    "initial_view",
    "Initial view for the gallery, one of: year, month, day, photo"
  )
  .describe("hostname", "Regex for hostnames that default to this gallery")
  .demandOption(["id"])
  .usage("Usage: $0 [options]")
  .parseSync();

const galleryId = argv.id as string;

db.loadGallery(galleryId)
  .then(async (gallery) => {
    const updatedGallery: Record<string, any> = {};
    if ("title" in argv) updatedGallery.title = argv.title;
    if ("description" in argv) updatedGallery.description = argv.description;
    if ("epoch" in argv) updatedGallery.epoch = argv.epoch;
    if ("epoch_type" in argv) updatedGallery.epoch_type = argv.epoch_type;
    if ("theme" in argv) updatedGallery.theme = argv.theme;
    if ("initial_view" in argv) updatedGallery.initial_view = argv.initial_view;
    db.updateGallery((gallery as { id: string }).id, updatedGallery).catch((error) => {
      logger.error("Failed:", error);
    });
    logger.info(`Existing gallery "${galleryId}" found and updated.`);
  })
  .catch(async () => {
    const newGallery = {
      id: galleryId,
      title: argv.title as string | undefined,
      description: argv.description as string | undefined,
      epoch: argv.epoch as string | undefined,
      epochType: argv.epoch_type as string | undefined,
      theme: argv.theme as string | undefined,
      initialView: argv.initial_view as string | undefined,
    };
    db.createGallery(newGallery).catch((error) => {
      logger.error("Failed:", error);
    });
    logger.info(`New gallery "${galleryId}" created.`);
  });
