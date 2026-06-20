// Drive the SPA via Playwright and dump screenshots of the
// regression-prone visitor surfaces. Assumes `seed.mjs` has
// populated .runtime/ and the SPA bundle is built into
// react-app/build (run `npm run build` from the repo root first).

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const RUNTIME_DIR = path.join(__dirname, ".runtime");
const OUT_DIR = path.join(REPO_ROOT, "docs/screenshots");
const PORT = 4202;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const VIEWPORT = { width: 1440, height: 900 };

// Server env mirrors seed.mjs so they read the same DB.
const SERVER_ENV = {
  ...process.env,
  NODE_ENV: "test",
  DB_DRIVER: "sqlite3",
  DB_OPTS: path.join(RUNTIME_DIR, "db.sqlite3"),
  SECRET: "screenshots-secret",
  PORT: String(PORT),
  STATIC_DIR: path.join(REPO_ROOT, "react-app/build"),
  BCRYPT_ROUNDS: "4",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const startServer = () => {
  const proc = spawn(
    "npx",
    ["tsx", path.join(REPO_ROOT, "server/index.ts")],
    {
      cwd: RUNTIME_DIR,
      env: SERVER_ENV,
      stdio: ["ignore", "inherit", "inherit"],
    }
  );
  return proc;
};

const waitForReady = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/meta`);
      if (res.ok) return;
    } catch {
      // not yet
    }
    await sleep(500);
  }
  throw new Error("server didn't come up");
};

const capture = async (page, urlPath, outName, opts = {}) => {
  console.log(`Capture: ${outName}…`);
  await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: "networkidle" });
  // The SPA fetches its meta + galleries asynchronously even after
  // network idle returns; give it a frame to settle.
  await sleep(800);
  if (opts.beforeShot) {
    await opts.beforeShot(page);
    await sleep(300);
  }
  await page.screenshot({
    path: path.join(OUT_DIR, `${outName}.png`),
    fullPage: false,
  });
};

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = startServer();
  server.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`server exited with ${code}`);
    }
  });

  try {
    await waitForReady();

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2, // retina-quality output
    });
    const page = await context.newPage();

    // Photo files (thumbnail / display variants) are served by nginx
    // in production. The dev server only handles /api/* + the SPA
    // bundle, so the SPA's <img> requests would 404. Intercept those
    // and serve from the fixture's photos/ dir.
    const photoPath = (url) => {
      const u = new URL(url);
      return path.join(RUNTIME_DIR, "photos" + u.pathname);
    };
    let photoServed = 0;
    let photoMissed = 0;
    await page.route(/\/(thumbnail|display)\//, async (route) => {
      const file = photoPath(route.request().url());
      if (!fs.existsSync(file)) {
        photoMissed++;
        console.warn(`[route] miss: ${route.request().url()} → ${file}`);
        return route.fulfill({ status: 404 });
      }
      photoServed++;
      const body = fs.readFileSync(file);
      return route.fulfill({
        status: 200,
        contentType: "image/jpeg",
        body,
      });
    });

    // 1. Year calendar — explicit year URL so the SPA renders the
    //    12-month heatmap grid (the default landing falls through to
    //    month view, which would hide the year shape).
    await capture(page, "/g/diary/2024", "01-calendar-year");

    // 2. Month calendar — pick July (one of the heaviest months per
    //    the seed's summer-weighted distribution).
    await capture(page, "/g/diary/2024/7", "02-calendar-month");

    // 3. Photo modal — open the first photo of the gallery. Read the
    //    DB via the API to find a stable id rather than hard-coding
    //    the NASA id that may change if we refresh the fixture.
    const queryResp = await context.request.post(
      `${BASE_URL}/api/v1/gallery-photos/diary/query`,
      { data: {} }
    );
    if (!queryResp.ok()) {
      throw new Error(`query call failed: ${queryResp.status()}`);
    }
    const photosJson = await queryResp.json();
    const photos = Array.isArray(photosJson)
      ? photosJson
      : (photosJson?.photos ?? []);
    if (photos.length === 0) {
      throw new Error("no photos returned from /query");
    }
    // Pick a real (file-backed) photo — synthetic DB-only entries
    // would render as a broken-image grey placeholder. The seed
    // prefixes synthesised ids with "synthetic-".
    const realPhotos = photos.filter((p) => !p.id.startsWith("synthetic-"));
    if (realPhotos.length === 0) {
      throw new Error("no real (file-backed) photos found");
    }
    const photo = realPhotos[Math.floor(realPhotos.length / 2)];
    const { year, month, day } = photo.taken.instant;
    await capture(
      page,
      `/g/diary/${year}/${month}/${day}/${encodeURIComponent(photo.id)}`,
      "03-photo-modal"
    );

    // 4. Stats (General + Time + Gear + first chart). Per-gallery
    //    stats route is /s/<gallery> (the gallery route's optional
    //    year/month/day params would swallow "stats" as a year).
    await capture(page, "/s/diary", "04-stats");

    console.log(`\nphoto intercepts: ${photoServed} served, ${photoMissed} missed`);
    await browser.close();
  } finally {
    server.kill("SIGTERM");
    // Give the server a moment to flush logs / write coverage.
    await sleep(500);
  }

  console.log(`\nDone. Screenshots in ${OUT_DIR}/`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
