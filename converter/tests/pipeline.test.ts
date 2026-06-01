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
  const dest = path.join(rootDir, "inbox", fileName);
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await fs.promises.copyFile(path.join(fixturesDir, fixture), dest);
};

const setupJson = async (fileName: string, content: unknown) => {
  const dest = path.join(rootDir, "inbox", fileName);
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await fs.promises.writeFile(dest, JSON.stringify(content));
};

// Pipeline now renames the file at intake to <ts>-<uuid>.<ext>; the test
// can't predict the uuid suffix, so locate the single output in each dir
// and verify the shape.
const ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-[0-9a-f]{16}\.jpg$/;
const onlyFile = async (dir: string): Promise<string> => {
  const entries = await fs.promises.readdir(dir);
  const jpgs = entries.filter((e) => e.endsWith(".jpg"));
  assert.equal(jpgs.length, 1, `expected one .jpg in ${dir}, got ${entries.join(", ")}`);
  return jpgs[0];
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

  // DB row holds the EXIF-extracted properties + the original filename.
  const row = (await db.loadPhoto(id)) as any;
  assert.equal(row.id, id);
  assert.equal(row.originalFilename, "photo.jpg");
  assert.equal(row.taken.instant.timestamp, "2024-01-15 10:30:45");
  assert.equal(row.taken.author, "TestArtist");
  assert.equal(row.camera.make, "TestMake");
  assert.equal(row.exposure.aperture, 5.6);
  assert.ok(row.dimensions.original.width > 0);
  assert.ok(row.dimensions.display.width > 0);
  assert.ok(row.dimensions.thumbnail.width > 0);
});

test("processes a JPEG without EXIF, falling back to mtime for the id", async () => {
  await setup("no-exif.jpg", "photo.jpg");

  await processFile("photo.jpg", rootDir);

  const id = await onlyFile(path.join(rootDir, "original"));
  assert.match(id, ID_PATTERN);
  assert.equal(await onlyFile(path.join(rootDir, "display")), id);
  assert.equal(await onlyFile(path.join(rootDir, "thumbnail")), id);

  const row = (await db.loadPhoto(id)) as any;
  assert.equal(row.id, id);
  assert.equal(row.originalFilename, "photo.jpg");
  // EXIF-less so the parsed instant comes through as the "Invalid date" sentinel.
  assert.equal(row.taken.instant.timestamp, "Invalid date");
  // Empty camera / lens / exposure shapes — values present but undefined.
  assert.equal(row.camera.make, undefined);
  assert.equal(row.camera.model, undefined);
  assert.equal(row.lens.make, undefined);
  assert.equal(row.lens.model, undefined);
  assert.equal(row.exposure.aperture, undefined);
  assert.ok(row.dimensions.original.width > 0);
});

test("re-importing the same SOOC replaces files in place and preserves opinion fields", async () => {
  await setup("with-exif.jpg", "IMG_1234.jpg");
  await processFile("IMG_1234.jpg", rootDir);

  const id = await onlyFile(path.join(rootDir, "original"));

  // Operator sets opinion fields via `bin/photo.ts update` — those
  // should survive a re-import.
  await db.updatePhoto(id, {
    title: "Operator-set title",
    taken: { location: { country: "JP", place: "Tokyo" } },
  } as any);

  // Re-drop the same SOOC (Lightroom re-publish). Same originalFilename
  // + EXIF DateTimeOriginal → converter reuses the existing id.
  await setup("with-exif.jpg", "IMG_1234.jpg");
  await processFile("IMG_1234.jpg", rootDir);

  // Still exactly one photo on disk (overwritten in place).
  const originalAfter = await fs.promises.readdir(
    path.join(rootDir, "original")
  );
  assert.deepEqual(originalAfter, [id]);

  const row = (await db.loadPhoto(id)) as any;
  assert.equal(row.id, id);
  assert.equal(row.originalFilename, "IMG_1234.jpg");
  // EXIF-derived fields refreshed.
  assert.equal(row.camera.make, "TestMake");
  // Opinion fields preserved.
  assert.equal(row.title, "Operator-set title");
  assert.equal(row.taken.location.country, "JP");
  assert.equal(row.taken.location.place, "Tokyo");
});

test("JSON-first stub with matching timestamp merges on SOOC intake", async () => {
  // Operator's enrichment JSON includes the capture timestamp (matches
  // EXIF DateTimeOriginal of the fixture). The converter merges onto
  // the existing stub instead of creating a second row.
  const stubId = "IMG_1234.jpg";
  await db.createPhoto({
    id: stubId,
    originalFilename: stubId,
    taken: {
      instant: { timestamp: "2024-01-15 10:30:45" },
      location: {
        coordinates: { latitude: 35.6762, longitude: 139.6503, altitude: null },
        country: "JP",
      },
    },
  } as any);

  const countBefore = Object.keys((await db.loadPhotos()) as Record<string, any>).length;

  await setup("with-exif.jpg", "IMG_1234.jpg");
  await processFile("IMG_1234.jpg", rootDir);

  const countAfter = Object.keys((await db.loadPhotos()) as Record<string, any>).length;
  assert.equal(
    countAfter,
    countBefore,
    "matching-timestamp stub should merge with SOOC, not produce a duplicate"
  );
  const row = (await db.loadPhoto(stubId)) as any;
  // Operator-set coords + country survive.
  assert.equal(row.taken.location.country, "JP");
  assert.equal(row.taken.location.coordinates.latitude, 35.6762);
  // EXIF-derived fields refreshed.
  assert.equal(row.camera.make, "TestMake");
  assert.equal(row.taken.instant.timestamp, "2024-01-15 10:30:45");
});

test("JSON-first stub WITHOUT timestamp does NOT merge (could be unrelated photos)", async () => {
  // Same camera filename, no proof it's the same photo. The stub
  // stays untouched; the SOOC imports as a new row with its own id.
  // The operator can still find both via `bin/photo.ts search`.
  const stubId = "IMG_1234.jpg";
  await db.createPhoto({
    id: stubId,
    originalFilename: stubId,
    taken: {
      location: {
        coordinates: { latitude: 35.6762, longitude: 139.6503, altitude: null },
      },
    },
  } as any);

  await setup("with-exif.jpg", "IMG_1234.jpg");
  await processFile("IMG_1234.jpg", rootDir);

  // Stub row still present, unchanged.
  const stub = (await db.loadPhoto(stubId)) as any;
  assert.equal(stub.id, stubId);
  assert.equal(stub.taken.location.coordinates.latitude, 35.6762);
  // A separate row was created for the SOOC with the new id format.
  const sooc = await onlyFile(path.join(rootDir, "original"));
  assert.match(sooc, ID_PATTERN);
  assert.notEqual(sooc, stubId);
  const soocRow = (await db.loadPhoto(sooc)) as any;
  assert.equal(soocRow.originalFilename, "IMG_1234.jpg");
});

test("EXIF-less re-import is NOT deduplicated (mtime isn't strong enough)", async () => {
  await setup("no-exif.jpg", "IMG_1234.jpg");
  await processFile("IMG_1234.jpg", rootDir);

  // Without an EXIF DateTimeOriginal, the converter can't be confident
  // the second drop is the same photo, so both get imported. The
  // operator can clean up via the admin UI later (or via the
  // upcoming bin/photo-rename.ts --scramble path).
  await setup("no-exif.jpg", "IMG_1234.jpg");
  await processFile("IMG_1234.jpg", rootDir);

  const originals = await fs.promises.readdir(path.join(rootDir, "original"));
  assert.equal(originals.filter((e) => e.endsWith(".jpg")).length, 2);
});

test("rejects an empty file", async () => {
  await fs.promises.writeFile(path.join(rootDir, "inbox", "empty.jpg"), "");

  await assert.rejects(processFile("empty.jpg", rootDir), /Skipping empty file/);
});

test("JPG in gallery subdir auto-links the photo to that gallery", async () => {
  await setup("with-exif.jpg", "gallery1/IMG_5678.jpg");
  await processFile("gallery1/IMG_5678.jpg", rootDir);

  const id = await onlyFile(path.join(rootDir, "original"));
  const photos = (await db.loadGalleryPhotos("gallery1")) as any[];
  assert.ok(
    photos.some((p) => p.id === id),
    `expected ${id} in gallery1; got ${photos.map((p) => p.id).join(", ")}`
  );
});

test("JPG in unknown gallery subdir is left in place", async () => {
  await setup("with-exif.jpg", "nosuchgallery/IMG_9999.jpg");
  // No throw, but file stays in inbox and no DB row is created.
  await processFile("nosuchgallery/IMG_9999.jpg", rootDir);

  await fs.promises.access(
    path.join(rootDir, "inbox", "nosuchgallery", "IMG_9999.jpg")
  );
  const originals = await fs.promises.readdir(path.join(rootDir, "original"));
  assert.equal(originals.length, 0);
});

test("JSON sidecar in gallery subdir updates the photo and archives to original/", async () => {
  // First import a SOOC so there's a row to update.
  await setup("with-exif.jpg", "IMG_ABC.jpg");
  await processFile("IMG_ABC.jpg", rootDir);
  const id = await onlyFile(path.join(rootDir, "original"));

  // Operator drops an intake JSON with coords in inbox/gallery2/.
  await setupJson("gallery2/new_IMG_ABC.json", {
    id: "IMG_ABC.jpg",
    taken: {
      instant: { timestamp: "2024-01-15 10:30:45" },
      location: {
        coordinates: { latitude: 35.6762, longitude: 139.6503, altitude: null },
      },
    },
  });

  await processFile("gallery2/new_IMG_ABC.json", rootDir);

  // Photo updated with coords.
  const row = (await db.loadPhoto(id)) as any;
  assert.equal(row.taken.location.coordinates.latitude, 35.6762);

  // Linked to gallery2.
  const photos = (await db.loadGalleryPhotos("gallery2")) as any[];
  assert.ok(photos.some((p) => p.id === id));

  // JSON archived to original/<id>.intake.json.
  await fs.promises.access(
    path.join(rootDir, "original", `${id}.intake.json`)
  );
});

test("multiple intake JSONs for the same photo archive with counter suffix", async () => {
  await setup("with-exif.jpg", "IMG_DEF.jpg");
  await processFile("IMG_DEF.jpg", rootDir);
  const id = await onlyFile(path.join(rootDir, "original"));

  for (let i = 0; i < 3; i++) {
    await setupJson(`gallery1/new_${i}.json`, {
      id: "IMG_DEF.jpg",
      taken: { instant: { timestamp: "2024-01-15 10:30:45" } },
    });
    await processFile(`gallery1/new_${i}.json`, rootDir);
  }

  await fs.promises.access(path.join(rootDir, "original", `${id}.intake.json`));
  await fs.promises.access(path.join(rootDir, "original", `${id}.intake.1.json`));
  await fs.promises.access(path.join(rootDir, "original", `${id}.intake.2.json`));
});

test("root-level intake JSON is processed without gallery link", async () => {
  // Import a SOOC so there's a photo to update.
  await setup("with-exif.jpg", "IMG_GHI.jpg");
  await processFile("IMG_GHI.jpg", rootDir);
  const id = await onlyFile(path.join(rootDir, "original"));

  // Operator drops an intake JSON at the inbox root (no gallery
  // auto-link; they'll link later via bin/photo.ts update --gallery
  // or the admin UI).
  await setupJson("new_IMG_GHI.json", {
    id: "IMG_GHI.jpg",
    taken: {
      instant: { timestamp: "2024-01-15 10:30:45" },
      location: {
        coordinates: { latitude: 12.34, longitude: 56.78, altitude: null },
      },
    },
  });

  await processFile("new_IMG_GHI.json", rootDir);

  const row = (await db.loadPhoto(id)) as any;
  assert.equal(row.taken.location.coordinates.latitude, 12.34);
  // Archived to original/<id>.intake.json.
  await fs.promises.access(
    path.join(rootDir, "original", `${id}.intake.json`)
  );
});
