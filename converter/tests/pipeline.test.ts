import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import processFile from "../process-file.js";
import { imageSizeFromFile } from "image-size/fromFile";
import db from "photo-diary-server/db/index.js";
import dummyFactory from "photo-diary-server/db/dummy.js";

const dummy = dummyFactory();

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, "fixtures");

let rootDir: string;

beforeEach(async () => {
  rootDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "converter-test-"));
  for (const sub of ["inbox", "original", "display", "thumbnail"]) {
    await fs.promises.mkdir(path.join(rootDir, sub));
  }
  await dummy.init();
});

afterEach(async () => {
  await fs.promises.rm(rootDir, { recursive: true, force: true });
});

const setup = async (fixture: string, fileName: string) => {
  await fs.promises.copyFile(
    path.join(fixturesDir, fixture),
    path.join(rootDir, "inbox", fileName)
  );
};

const readJson = async (fileName: string) => {
  const jsonPath = path.join(rootDir, "inbox", `${fileName}.json`);
  const raw = await fs.promises.readFile(jsonPath, "utf8");
  return JSON.parse(raw);
};

test("processes a JPEG with EXIF end-to-end", async () => {
  await setup("with-exif.jpg", "photo.jpg");

  await processFile("photo.jpg", rootDir);

  // Original moved out of inbox.
  await assert.rejects(
    fs.promises.access(path.join(rootDir, "inbox", "photo.jpg"))
  );
  await fs.promises.access(path.join(rootDir, "original", "photo.jpg"));

  // Resized variants exist with the expected dimensions.
  const displayDims = await imageSizeFromFile(
    path.join(rootDir, "display", "photo.jpg")
  );
  assert.ok(displayDims.width <= 1500);
  assert.ok(displayDims.height <= 1500);

  const thumbDims = await imageSizeFromFile(
    path.join(rootDir, "thumbnail", "photo.jpg")
  );
  assert.ok(thumbDims.width <= 600);
  assert.ok(thumbDims.height <= 200);

  // JSON has the expected shape and parsed EXIF values.
  const json = await readJson("photo.jpg");
  const props = json["photo.jpg"];

  assert.equal(props.id, "photo.jpg");
  assert.equal(props.taken.instant.timestamp, "2024-01-15 10:30:45");
  assert.equal(props.taken.instant.year, 2024);
  assert.equal(props.taken.instant.month, 1);
  assert.equal(props.taken.instant.day, 15);
  assert.equal(props.taken.author, "TestArtist");
  assert.equal(props.camera.make, "TestMake");
  assert.equal(props.camera.model, "TestModel");
  assert.equal(props.exposure.aperture, 5.6);
  assert.equal(props.exposure.iso, 200);
  assert.equal(props.exposure.focalLength, 50);

  // Dimensions populated for all three sizes.
  assert.ok(props.dimensions.original.width > 0);
  assert.ok(props.dimensions.display.width > 0);
  assert.ok(props.dimensions.thumbnail.width > 0);

  // Minimal DB row created at intake with the factual EXIF fields +
  // originalFilename. Opinion fields (title, country, place, …) stay
  // empty for the operator's enrichment JSON to fill in later.
  const row = (await db.loadPhoto("photo.jpg")) as Record<string, unknown>;
  assert.equal(row.id, "photo.jpg");
  assert.equal(row.originalFilename, "photo.jpg");
});

test("processes a JPEG without EXIF, producing 'Invalid date' placeholders", async () => {
  await setup("no-exif.jpg", "photo.jpg");

  await processFile("photo.jpg", rootDir);

  await fs.promises.access(path.join(rootDir, "original", "photo.jpg"));
  await fs.promises.access(path.join(rootDir, "display", "photo.jpg"));
  await fs.promises.access(path.join(rootDir, "thumbnail", "photo.jpg"));

  const json = await readJson("photo.jpg");
  const props = json["photo.jpg"];

  assert.equal(props.id, "photo.jpg");
  assert.equal(props.taken.instant.timestamp, "Invalid date");
  assert.equal(props.taken.instant.year, null);
  assert.deepEqual(props.camera, {});
  assert.deepEqual(props.lens, {});
  assert.deepEqual(props.exposure, {});
  assert.ok(props.dimensions.original.width > 0);
});

test("rejects an empty file", async () => {
  await fs.promises.writeFile(path.join(rootDir, "inbox", "empty.jpg"), "");

  await assert.rejects(processFile("empty.jpg", rootDir), /Skipping empty file/);
});
