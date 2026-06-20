// Seeds the screenshot-fixture instance under .runtime/.
//
// Two photo sets:
//
//   - FILES: 7 photos that get real JPEG files on disk (display +
//     thumbnail). These are the ones the screenshots actually
//     render — month-view tiles in July and the photo-modal frame.
//     Currently filled by `fetch.mjs` from NASA's public image
//     library; can be swapped for AI-generated placeholders later
//     (see PROMPTS.md for prompts that match the synthesised EXIF).
//   - SYNTHETIC: ~75 DB-only entries spread across the rest of 2024
//     so the year heat-map + stats charts look populated. No files
//     written; the SPA's thumbnail requests for these months 404
//     out via Playwright's route handler in `capture.mjs` and the
//     year/stats surfaces don't request thumbnails anyway.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const PHOTOS_SRC = path.join(__dirname, "photos");
const RUNTIME_DIR = path.join(__dirname, ".runtime");
const PHOTOS_DIR = path.join(RUNTIME_DIR, "photos");
const DB_PATH = path.join(RUNTIME_DIR, "db.sqlite3");

const DISPLAY_MAX_DIM = 1500;
const THUMBNAIL_WIDTH = 600;
const THUMBNAIL_HEIGHT = 200;

// The 7 photos that get real files. Order matters — `day` is used
// as-is so the month view's heat-map shows the cluster pattern we
// want. `sourceFile` points at the committed JPEG; swap for an
// AI-generated replacement of the same filename to refresh.
const FILES = [
  {
    sourceFile: "GSFC_20171208_Archive_e001465.jpg",
    day: 2,
    hour: 10,
    camera: { make: "Fujifilm", model: "X-T5", lensModel: "XF 23mm F1.4 R LM WR" },
    location: { country: "is", place: "Reykjavik", lat: 64.1466, lon: -21.9426 },
    focalLength: 23,
    aperture: 2.8,
    exposureTime: 0.002,
    iso: 200,
  },
  {
    sourceFile: "KSC-20180418-PH_FWM01_0013.jpg",
    day: 6,
    hour: 14,
    camera: { make: "Canon", model: "EOS R5", lensModel: "RF 24-70mm F2.8 L IS USM" },
    location: { country: "us", place: "Cape Canaveral", lat: 28.5729, lon: -80.6490 },
    focalLength: 70,
    aperture: 5.6,
    exposureTime: 0.0008,
    iso: 200,
  },
  {
    sourceFile: "PIA04216.jpg",
    day: 11,
    hour: 21,
    camera: { make: "Sony", model: "ILCE-7M4", lensModel: "FE 16-35mm F2.8 GM" },
    location: { country: "no", place: "Tromsø", lat: 69.6492, lon: 18.9553 },
    focalLength: 16,
    aperture: 2.8,
    exposureTime: 4,
    iso: 1600,
  },
  {
    sourceFile: "PIA04220.jpg",
    day: 15,
    hour: 9,
    camera: { make: "Nikon", model: "Z 8", lensModel: "NIKKOR Z 50mm f/1.8 S" },
    location: { country: "jp", place: "Tokyo", lat: 35.6762, lon: 139.6503 },
    focalLength: 50,
    aperture: 4,
    exposureTime: 0.001,
    iso: 100,
  },
  {
    sourceFile: "PIA04634.jpg",
    day: 19,
    hour: 17,
    camera: { make: "Leica", model: "Q2", lensModel: "SUMMILUX 28mm f/1.7 ASPH" },
    location: { country: "it", place: "Rome", lat: 41.9028, lon: 12.4964 },
    focalLength: 28,
    aperture: 5.6,
    exposureTime: 0.001,
    iso: 400,
  },
  {
    sourceFile: "PIA04921.jpg",
    day: 24,
    hour: 11,
    camera: { make: "Fujifilm", model: "X-T5", lensModel: "XF 23mm F1.4 R LM WR" },
    location: { country: "fi", place: "Helsinki", lat: 60.1699, lon: 24.9384 },
    focalLength: 23,
    aperture: 1.4,
    exposureTime: 0.002,
    iso: 200,
  },
  {
    sourceFile: "PIA05445.jpg",
    day: 28,
    hour: 16,
    camera: { make: "Canon", model: "EOS R5", lensModel: "RF 24-70mm F2.8 L IS USM" },
    location: { country: "nz", place: "Queenstown", lat: -45.0312, lon: 168.6626 },
    focalLength: 35,
    aperture: 8,
    exposureTime: 0.005,
    iso: 100,
  },
];

const SYNTHETIC_CAMERAS = [
  { make: "Fujifilm", model: "X-T5", lensModel: "XF 23mm F1.4 R LM WR" },
  { make: "Canon", model: "EOS R5", lensModel: "RF 24-70mm F2.8 L IS USM" },
  { make: "Nikon", model: "Z 8", lensModel: "NIKKOR Z 50mm f/1.8 S" },
  { make: "Sony", model: "ILCE-7M4", lensModel: "FE 16-35mm F2.8 GM" },
  { make: "Leica", model: "Q2", lensModel: "SUMMILUX 28mm f/1.7 ASPH" },
];

const SYNTHETIC_LOCATIONS = [
  { country: "jp", place: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { country: "is", place: "Reykjavik", lat: 64.1466, lon: -21.9426 },
  { country: "it", place: "Rome", lat: 41.9028, lon: 12.4964 },
  { country: "no", place: "Tromsø", lat: 69.6492, lon: 18.9553 },
  { country: "us", place: "Yosemite", lat: 37.8651, lon: -119.5383 },
  { country: "fr", place: "Paris", lat: 48.8566, lon: 2.3522 },
  { country: "fi", place: "Helsinki", lat: 60.1699, lon: 24.9384 },
  { country: "nz", place: "Queenstown", lat: -45.0312, lon: 168.6626 },
  { country: "ca", place: "Banff", lat: 51.4968, lon: -115.9281 },
  { country: "kr", place: "Seoul", lat: 37.5665, lon: 126.978 },
];

const FOCAL_LENGTHS = [14, 24, 28, 35, 50, 85, 105, 135, 200];
const APERTURES = [1.4, 2.0, 2.8, 4.0, 5.6, 8.0, 11];
const EXPOSURE_TIMES = [0.0005, 0.001, 0.002, 0.004, 0.008, 0.016];
const ISOS = [100, 200, 400, 800, 1600];

// Synthetic photos spread across non-July 2024 months with seasonal
// weighting (heavier in spring + summer like a real photo diary).
// Clusters some photos onto the same day so the year heat-map shows
// real colour variation (single-photo days are pale, multi-photo days
// are progressively darker).
const distributeAcrossMonth = (n) => {
  // Six fixed days per month; weighted so the first 2-3 land on the
  // first day, giving deliberate clustering.
  const buckets = [3, 8, 14, 19, 24, 28];
  const weights = [3, 2, 2, 1, 1, 1];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const days = [];
  for (let i = 0; i < buckets.length; i++) {
    const share = Math.round((n * weights[i]) / totalWeight);
    for (let j = 0; j < share; j++) days.push(buckets[i]);
  }
  while (days.length < n) days.push(buckets[days.length % buckets.length]);
  return days.slice(0, n);
};

const synthesisedTimestamps = () => {
  const monthCounts = {
    1: 4, 2: 3, 3: 7, 4: 9, 5: 11, 6: 13, /* 7: skipped — real files */
    8: 12, 9: 8, 10: 6, 11: 4, 12: 3,
  };
  const out = [];
  for (const [m, count] of Object.entries(monthCounts)) {
    const month = Number(m);
    const days = distributeAcrossMonth(count);
    for (let i = 0; i < count; i++) {
      const day = days[i];
      const hour = (i * 5 + 7) % 18;
      const minute = (i * 17) % 60;
      out.push({
        month,
        day,
        hour,
        minute,
        timestamp: `2024-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
      });
    }
  }
  return out.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};

const ensureRuntimeDir = () => {
  for (const sub of [
    "",
    "photos",
    "photos/inbox",
    "photos/original",
    "photos/thumbnail",
    `photos/display/${DISPLAY_MAX_DIM}`,
  ]) {
    fs.mkdirSync(path.join(RUNTIME_DIR, sub), { recursive: true });
  }
};

const photoIdFromSourceName = (sourceName) => {
  const stem = sourceName.replace(/\.jpe?g$/i, "");
  return stem.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
};

const buildPhotoPayload = ({
  id,
  index,
  ts,
  camera,
  location,
  focal,
  aperture,
  exposureTime,
  iso,
  dimensions,
}) => ({
  id,
  index,
  title: "",
  description: "",
  taken: {
    instant: {
      timestamp: ts.timestamp,
      year: 2024,
      month: ts.month,
      day: ts.day,
      hour: ts.hour,
      minute: ts.minute,
      second: 0,
    },
    author: "Photo Diary fixture",
    location: {
      country: location.country,
      place: location.place,
      coordinates: {
        latitude: location.lat,
        longitude: location.lon,
        altitude: null,
      },
    },
  },
  camera: { make: camera.make, model: camera.model, serial: "" },
  lens: { make: camera.make, model: camera.lensModel, serial: "" },
  exposure: {
    focalLength: focal,
    aperture,
    exposureTime,
    iso,
  },
  dimensions,
});

const main = async () => {
  ensureRuntimeDir();
  try {
    fs.unlinkSync(DB_PATH);
  } catch {
    // Didn't exist; fine.
  }

  process.env.NODE_ENV = "test";
  process.env.DB_DRIVER = "sqlite3";
  process.env.DB_OPTS = DB_PATH;
  process.env.SECRET = "screenshots-secret";
  process.env.PORT = "4202";
  process.env.BCRYPT_ROUNDS = "4";

  const { default: db } = await import(
    path.join(REPO_ROOT, "server/db/index.ts")
  );
  const sharpMod = await import("sharp");
  const sharp = sharpMod.default;

  await db.createUser({
    id: "demo",
    name: "demo",
    password: "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG",
    secret: "screenshots-secret-demo",
    is_admin: 1,
  });
  await db.createGallery({
    id: "diary",
    title: "Diary",
    description: "Photo diary screenshot fixture",
    theme: "blue",
  });
  await db.upsertUserGallery({
    user_id: ":guest",
    gallery_id: "diary",
    is_editor: false,
  });

  console.log(`Seeding ${FILES.length} real + synthetic photos…`);
  let index = 0;
  const linkedIds = [];

  // FILES: real JPEGs + sharp-generated variants + DB row.
  for (const f of FILES) {
    const id = photoIdFromSourceName(f.sourceFile);
    const sourcePath = path.join(PHOTOS_SRC, f.sourceFile);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(
        `Missing source file ${f.sourceFile} — run fetch.mjs (or drop a replacement at the same path).`
      );
    }
    const originalPath = path.join(PHOTOS_DIR, "original", `${id}.jpg`);
    const displayPath = path.join(
      PHOTOS_DIR,
      "display",
      String(DISPLAY_MAX_DIM),
      `${id}.jpg`
    );
    const thumbnailPath = path.join(PHOTOS_DIR, "thumbnail", `${id}.jpg`);

    fs.copyFileSync(sourcePath, originalPath);
    const origMeta = await sharp(sourcePath).metadata();
    await sharp(sourcePath)
      .resize(DISPLAY_MAX_DIM, DISPLAY_MAX_DIM, { fit: "inside" })
      .jpeg({ quality: 88 })
      .toFile(displayPath);
    await sharp(sourcePath)
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toFile(thumbnailPath);

    const photoId = `${id}.jpg`;
    await db.createPhoto(
      buildPhotoPayload({
        id: photoId,
        index: index++,
        ts: {
          month: 7,
          day: f.day,
          hour: f.hour,
          minute: 0,
          timestamp: `2024-07-${String(f.day).padStart(2, "0")} ${String(f.hour).padStart(2, "0")}:00:00`,
        },
        camera: f.camera,
        location: f.location,
        focal: f.focalLength,
        aperture: f.aperture,
        exposureTime: f.exposureTime,
        iso: f.iso,
        dimensions: {
          original: { width: origMeta.width, height: origMeta.height },
          thumbnail: { width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT },
        },
      })
    );
    await db.upsertPhotoRendition(photoId, DISPLAY_MAX_DIM);
    linkedIds.push(photoId);
  }

  // SYNTHETIC: DB-only entries spread across the rest of 2024.
  // No files written — the SPA's thumbnail fetches for non-July
  // months are 404'd by capture.mjs's route handler, and the year /
  // stats surfaces don't request thumbnails anyway.
  const synthetic = synthesisedTimestamps();
  for (let i = 0; i < synthetic.length; i++) {
    const ts = synthetic[i];
    const camera = SYNTHETIC_CAMERAS[i % SYNTHETIC_CAMERAS.length];
    const location = SYNTHETIC_LOCATIONS[i % SYNTHETIC_LOCATIONS.length];
    const focal = FOCAL_LENGTHS[i % FOCAL_LENGTHS.length];
    const aperture = APERTURES[i % APERTURES.length];
    const exposureTime = EXPOSURE_TIMES[i % EXPOSURE_TIMES.length];
    const iso = ISOS[i % ISOS.length];
    const photoId = `synthetic-${String(i).padStart(3, "0")}.jpg`;
    await db.createPhoto(
      buildPhotoPayload({
        id: photoId,
        index: index++,
        ts,
        camera,
        location,
        focal,
        aperture,
        exposureTime,
        iso,
        dimensions: {
          original: { width: 3000, height: 2000 },
          thumbnail: { width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT },
        },
      })
    );
    linkedIds.push(photoId);
  }

  await db.linkGalleryPhoto(["diary"], linkedIds);
  console.log(`Seeded ${linkedIds.length} photos to ${DB_PATH}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
