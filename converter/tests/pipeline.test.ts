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

// Pipeline now renames the file at intake to <ts>-<uuid>.<ext>; the test
// can't predict the uuid suffix, so locate the single output in each dir
// and verify the shape.
const ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-[0-9a-f]{8}\.jpg$/;
const onlyFile = async (dir: string): Promise<string> => {
  const entries = await fs.promises.readdir(dir);
  const jpgs = entries.filter((e) => e.endsWith(".jpg"));
  assert.equal(jpgs.length, 1, `expected one .jpg in ${dir}, got ${entries.join(", ")}`);
  return jpgs[0];
};
const readJson = async (id: string) => {
  const jsonPath = path.join(rootDir, "inbox", `${id}.json`);
  const raw = await fs.promises.readFile(jsonPath, "utf8");
  return JSON.parse(raw);
};

test("processes a JPEG with EXIF end-to-end and renames to <ts>-<uuid>.jpg", async () => {
  await setup("with-exif.jpg", "photo.jpg");

  await processFile("photo.jpg", rootDir);

  // Original moved out of inbox.
  await assert.rejects(
    fs.promises.access(path.join(rootDir, "inbox", "photo.jpg"))
  );

  // Renamed to <ts>-<uuid>.jpg in original/, display/, thumbnail/.
  const id = await onlyFile(path.join(rootDir, "original"));
  assert.match(id, ID_PATTERN);
  // Timestamp portion derives from EXIF DateTimeOriginal (2024-01-15 10:30:45).
  assert.ok(id.startsWith("2024-01-15T10-30-45-"));
  assert.equal(await onlyFile(path.join(rootDir, "display")), id);
  assert.equal(await onlyFile(path.join(rootDir, "thumbnail")), id);

  const displayDims = await imageSizeFromFile(
    path.join(rootDir, "display", id)
  );
  assert.ok(displayDims.width <= 1500);
  assert.ok(displayDims.height <= 1500);

  const thumbDims = await imageSizeFromFile(
    path.join(rootDir, "thumbnail", id)
  );
  assert.ok(thumbDims.width <= 600);
  assert.ok(thumbDims.height <= 200);

  // Sidecar JSON keyed on the new id, with originalFilename preserved
  // so the archive is self-contained.
  const json = await readJson(id);
  const props = json[id];

  assert.equal(props.id, id);
  assert.equal(props.originalFilename, "photo.jpg");
  assert.equal(props.taken.instant.timestamp, "2024-01-15 10:30:45");
  assert.equal(props.taken.author, "TestArtist");
  assert.equal(props.camera.make, "TestMake");
  assert.equal(props.exposure.aperture, 5.6);
  assert.ok(props.dimensions.original.width > 0);
  assert.ok(props.dimensions.display.width > 0);
  assert.ok(props.dimensions.thumbnail.width > 0);

  // DB row at the new id, with originalFilename pointing at the old name.
  const row = (await db.loadPhoto(id)) as Record<string, unknown>;
  assert.equal(row.id, id);
  assert.equal(row.originalFilename, "photo.jpg");
});

test("processes a JPEG without EXIF, falling back to mtime for the id", async () => {
  await setup("no-exif.jpg", "photo.jpg");

  await processFile("photo.jpg", rootDir);

  const id = await onlyFile(path.join(rootDir, "original"));
  assert.match(id, ID_PATTERN);
  assert.equal(await onlyFile(path.join(rootDir, "display")), id);
  assert.equal(await onlyFile(path.join(rootDir, "thumbnail")), id);

  const json = await readJson(id);
  const props = json[id];

  assert.equal(props.id, id);
  assert.equal(props.originalFilename, "photo.jpg");
  // EXIF-less so the parsed instant comes through as the "Invalid date" sentinel.
  assert.equal(props.taken.instant.timestamp, "Invalid date");
  assert.deepEqual(props.camera, {});
  assert.deepEqual(props.lens, {});
  assert.deepEqual(props.exposure, {});
  assert.ok(props.dimensions.original.width > 0);
});

test("two photos with the same camera filename get distinct ids", async () => {
  await setup("with-exif.jpg", "IMG_1234.jpg");
  await processFile("IMG_1234.jpg", rootDir);

  await setup("with-exif.jpg", "IMG_1234.jpg");
  await processFile("IMG_1234.jpg", rootDir);

  const originals = await fs.promises.readdir(path.join(rootDir, "original"));
  const jpgs = originals.filter((e) => e.endsWith(".jpg"));
  assert.equal(jpgs.length, 2, "second import should not overwrite first");
  // The uuid portion differs even when the timestamp prefix is identical.
  assert.notEqual(jpgs[0], jpgs[1]);
});

test("rejects an empty file", async () => {
  await fs.promises.writeFile(path.join(rootDir, "inbox", "empty.jpg"), "");

  await assert.rejects(processFile("empty.jpg", rootDir), /Skipping empty file/);
});
