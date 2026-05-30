#!/usr/bin/env -S npx tsx
/* eslint-disable @typescript-eslint/no-explicit-any, no-console -- interactive CLI tool; console output is the UI */
import fs from "node:fs";
import path from "node:path";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import logger from "../lib/logger.js";
import db from "../db/index.js";
import {
  acceptLocalizedCity,
  RULED_LANGS,
} from "../lib/localized-script.js";
import { lookup, type Lookup } from "../lib/photo-intake.js";
import { normalizeCity } from "photo-diary-converter/reverse-geocode/normalize.js";

const formatTable = (rows: string[][]): string => {
  if (rows.length <= 1) return rows[0]?.join("  ") ?? "";
  const widths = rows[0].map((_, col) =>
    Math.max(...rows.map((r) => r[col].length))
  );
  return rows
    .map((row, i) => {
      const padded = row.map((cell, c) => cell.padEnd(widths[c])).join("  ");
      return i === 0
        ? `${padded}\n${widths.map((w) => "-".repeat(w)).join("  ")}`
        : padded;
    })
    .join("\n");
};

const addToGalleries = async (photoId: string, galleries: unknown) => {
  if (!galleries) return;
  const list = typeof galleries === "string" ? [galleries] : (galleries as string[]);
  try {
    await db.unlinkAllGalleries(photoId);
    await db.linkGalleryPhoto(list, [photoId]);
    logger.info(`Photo "${photoId}" linked to galleries ${list.map((g) => `"${g}"`).join(", ")}`);
  } catch (error) {
    logger.error(`Linking "${photoId}" failed:`, error);
  }
};

const reportAmbiguous = (photo: any, candidates: any[]) => {
  const wantTaken = photo.taken?.instant?.timestamp;
  console.error(
    `Cannot resolve "${photo.id}" unambiguously. Existing row(s) with that originalFilename:`
  );
  for (const c of candidates) {
    const taken = c.taken?.instant?.timestamp ?? "—";
    console.error(`  ${c.id}  taken=${taken}`);
  }
  if (!wantTaken) {
    console.error(
      "Add taken.instant.timestamp to the input JSON to confirm which row to update (or that this is a different photo)."
    );
  } else {
    console.error(
      `No row matched taken.instant.timestamp="${wantTaken}". If this is a different photo with a rolled-over filename, use the renamed id directly.`
    );
  }
};

const applyOverrides = (photo: any, argv: any) => {
  if ("title" in argv) photo.title = argv.title;
  if ("description" in argv) photo.description = argv.description;
  if ("author" in argv) {
    photo.taken = photo.taken || {};
    photo.taken.author = argv.author;
  }
  if ("country" in argv) {
    photo.taken = photo.taken || {};
    photo.taken.location = photo.taken.location || {};
    photo.taken.location.country = argv.country;
  }
  if ("place" in argv) {
    photo.taken = photo.taken || {};
    photo.taken.location = photo.taken.location || {};
    photo.taken.location.place = argv.place;
  }
  if ("camera-make" in argv) {
    photo.camera = photo.camera || {};
    photo.camera.make = argv["camera-make"];
  }
  if ("camera-model" in argv) {
    photo.camera = photo.camera || {};
    photo.camera.model = argv["camera-model"];
  }
  if ("lens-make" in argv) {
    photo.lens = photo.lens || {};
    photo.lens.make = argv["lens-make"];
  }
  if ("lens-model" in argv) {
    photo.lens = photo.lens || {};
    photo.lens.model = argv["lens-model"];
  }
  if ("focal" in argv) {
    photo.exposure = photo.exposure || {};
    photo.exposure.focalLength = argv.focal;
  }
  if ("aperture" in argv) {
    photo.exposure = photo.exposure || {};
    photo.exposure.aperture = argv.aperture;
  }
};

const processPhoto = async (photo: any, argv: any) => {
  if (!photo.id) {
    logger.error("Photo JSON has no id; skipping");
    return;
  }
  applyOverrides(photo, argv);

  const r = await lookup(photo);
  if (r.kind === "ambiguous") {
    reportAmbiguous(photo, r.candidates);
    process.exitCode = 1;
    return;
  }
  if (r.kind === "update") {
    const update = { ...photo };
    delete update.id;
    try {
      await db.updatePhoto(r.existingId, update);
      logger.info(`Updated "${r.existingId}"`);
      await addToGalleries(r.existingId, argv.gallery);
    } catch (error) {
      logger.error(`Update of "${r.existingId}" failed:`, error);
    }
    return;
  }
  // create — default originalFilename to the input id so the converter's
  // `loadPhotosByOriginalFilename` finds this row when the SOOC eventually
  // arrives (JSON-first stub flow). The operator's existing
  // `{ id, taken: { location: { coordinates }}}` JSONs keep working without
  // having to also send originalFilename explicitly.
  const create = { ...photo };
  if (!create.originalFilename) create.originalFilename = create.id;
  try {
    await db.createPhoto(create);
    logger.info(`Created "${create.id}"`);
    await addToGalleries(create.id, argv.gallery);
  } catch (error) {
    logger.error(`Creating "${create.id}" failed:`, error);
  }
};

const processJson = async (filePath: string, argv: any) => {
  try {
    const json = await fs.promises.readFile(filePath, { encoding: "utf-8" });
    const data = JSON.parse(json);
    if (Array.isArray(data)) {
      for (const photo of data) await processPhoto(photo, argv);
    } else if (!("id" in data)) {
      for (const photo of Object.values(data)) await processPhoto(photo, argv);
    } else {
      await processPhoto(data, argv);
    }
  } catch (error) {
    logger.error("Failed:", error);
  }
};

const processJpeg = async (filePath: string, argv: any) => {
  const fileName = path.basename(filePath);
  await processPhoto({ id: fileName }, argv);
};

// ---- audit ---------------------------------------------------------------

// Empty-data sentinel: NULL → "" through mapRow; "Invalid date" is the
// explicit placeholder readExif emits for EXIF-less imports.
const isMissing = (v: unknown): boolean =>
  v === null || v === undefined || v === "" || v === "unknown" || v === "Invalid date";

type MissingField =
  | "taken"
  | "coords"
  | "place"
  | "country"
  | "author"
  | "title"
  | "description";

const MISSING_PROBES: Record<MissingField, (p: any) => boolean> = {
  taken: (p) => isMissing(p.taken?.instant?.timestamp),
  coords: (p) =>
    isMissing(p.taken?.location?.coordinates?.latitude) ||
    isMissing(p.taken?.location?.coordinates?.longitude),
  place: (p) => isMissing(p.taken?.location?.place),
  country: (p) => isMissing(p.taken?.location?.country),
  author: (p) => isMissing(p.taken?.author),
  title: (p) => isMissing(p.title),
  description: (p) => isMissing(p.description),
};

interface AuditCheck {
  key: string;
  title: string;
  rows: () => Array<{ id: string; row: any; why?: string }>;
  whyLabel?: string;
  footer?: () => string | undefined;
}

const buildChecks = (
  photos: any[],
  orphanIds: Set<string>
): AuditCheck[] => {
  const checks: AuditCheck[] = [];

  for (const field of Object.keys(MISSING_PROBES) as MissingField[]) {
    const probe = MISSING_PROBES[field];
    checks.push({
      key: `missing-${field}`,
      title: `Photos with missing ${field}`,
      rows: () =>
        photos.filter(probe).map((p) => ({ id: p.id, row: p })),
    });
  }

  checks.push({
    key: "orphans",
    title: "Photos with no gallery_photo link",
    rows: () =>
      photos
        .filter((p) => orphanIds.has(p.id))
        .map((p) => ({ id: p.id, row: p })),
  });

  checks.push({
    key: "duplicates",
    title: "Photos sharing an originalFilename",
    whyLabel: "duplicate of",
    rows: () => {
      const byName = new Map<string, any[]>();
      for (const p of photos) {
        const name = (p.originalFilename ?? "") as string;
        if (!name) continue;
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name)!.push(p);
      }
      const out: Array<{ id: string; row: any; why?: string }> = [];
      for (const [name, group] of byName) {
        if (group.length <= 1) continue;
        for (const p of group) out.push({ id: p.id, row: p, why: name });
      }
      return out;
    },
  });

  // Operator-set country vs Nominatim's geocoded country. The operator
  // value wins by convention (custom labels, region overrides) — this
  // check just surfaces the drift so the operator can decide which is
  // wrong. Photos still missing geocoded data are counted separately so
  // they don't dilute the mismatch list.
  checks.push({
    key: "country-mismatch",
    title: "Photos where operator country and geocoded country disagree",
    whyLabel: "operator → geocoded",
    rows: () => {
      const out: Array<{ id: string; row: any; why?: string }> = [];
      for (const p of photos) {
        const operator = p.taken?.location?.country;
        const geocoded = p.geocoded?.countryCode;
        if (!operator || !geocoded) continue;
        if (operator.toLowerCase() === geocoded.toLowerCase()) continue;
        out.push({
          id: p.id,
          row: p,
          why: `${operator} → ${geocoded}`,
        });
      }
      return out;
    },
    footer: () => {
      let withCoords = 0;
      let pending = 0;
      let noData = 0;
      for (const p of photos) {
        const lat = p.taken?.location?.coordinates?.latitude;
        const lon = p.taken?.location?.coordinates?.longitude;
        if (lat === null || lat === undefined) continue;
        if (lon === null || lon === undefined) continue;
        withCoords += 1;
        if (p.geocoded?.countryCode) continue;
        if (p.geocoded?.noData) noData += 1;
        else pending += 1;
      }
      const lines: string[] = [];
      if (pending > 0) {
        lines.push(
          `(${pending} of ${withCoords} photo(s) with coords still need geocoding — run \`./bin/photo-geocode.ts\` first)`
        );
      }
      if (noData > 0) {
        lines.push(
          `(${noData} of ${withCoords} photo(s) with coords have no Nominatim coverage; flagged \`geocode_no_data\`)`
        );
      }
      return lines.length > 0 ? lines.join("\n") : undefined;
    },
  });

  // Photos with coords and a geocoded city but no ISO 3166-2 subdivision
  // code (`geocoded_state_code`). The state column on the row stays
  // populated from Nominatim's localized field — what's missing is the
  // language-neutral identifier the client now uses as the city-tuple
  // disambiguator and the state filter / stats key.
  checks.push({
    key: "missing-state-code",
    title:
      "Photos with coords + city but no geocoded_state_code (ISO 3166-2)",
    whyLabel: "country / state / city",
    rows: () => {
      const out: Array<{ id: string; row: any; why?: string }> = [];
      for (const p of photos) {
        const lat = p.taken?.location?.coordinates?.latitude;
        const lon = p.taken?.location?.coordinates?.longitude;
        if (lat === null || lat === undefined) continue;
        if (lon === null || lon === undefined) continue;
        if (!p.geocoded?.city) continue;
        if (p.geocoded?.stateCode) continue;
        const country = p.geocoded?.countryCode ?? "?";
        const state = p.geocoded?.state ?? "";
        out.push({
          id: p.id,
          row: p,
          why: `${country} / ${state} / ${p.geocoded.city}`,
        });
      }
      return out;
    },
  });

  return checks;
};

const printCheck = (
  check: AuditCheck,
  results: Array<{ id: string; row: any; why?: string }>,
  format: "table" | "ids"
): void => {
  if (format === "ids") {
    for (const r of results) console.log(r.id);
    return;
  }
  console.log(`\n${check.title}: ${results.length}`);
  if (results.length > 0) {
    const showWhy = results.some((r) => r.why !== undefined);
    const header = showWhy
      ? ["id", "originalFilename", "taken", check.whyLabel ?? "why"]
      : ["id", "originalFilename", "taken"];
    const table: string[][] = [header];
    for (const r of results) {
      const base = [
        r.id ?? "",
        r.row.originalFilename ?? "",
        r.row.taken?.instant?.timestamp ?? "",
      ];
      table.push(showWhy ? [...base, r.why ?? ""] : base);
    }
    console.log(formatTable(table));
  }
  const footer = check.footer?.();
  if (footer) console.log(footer);
};

await yargs(hideBin(process.argv))
  .scriptName("photo.ts")
  .locale("en")
  .strict()
  .command(
    "$0 <files..>",
    "Add or update photos from JSON / JPEG files",
    (y) =>
      y
        .positional("files", { describe: "JSON or JPEG paths", type: "string", array: true })
        .option("gallery", {
          describe: "Link the photo(s) to one or more galleries (repeat for multiple)",
          type: "array",
          string: true,
        })
        .group(["title", "description", "country"], "Properties")
        .option("title", { type: "string", describe: "Title" })
        .option("description", { type: "string", describe: "Description" })
        .option("country", {
          type: "string",
          describe: "Two-letter country code (ISO 3166-1 alpha-2)",
        })
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
        .option("author", { type: "string", describe: "Author" })
        .option("place", { type: "string", describe: "Free-form place description" })
        .option("camera-make", { type: "string", describe: "Camera make" })
        .option("camera-model", { type: "string", describe: "Camera model" })
        .option("lens-make", { type: "string", describe: "Lens make" })
        .option("lens-model", { type: "string", describe: "Lens model" })
        .option("focal", { type: "number", describe: "Focal length" })
        .option("aperture", { type: "number", describe: "Aperture value (f-number)" }),
    async (argv) => {
      for (const filePath of argv.files ?? []) {
        const fp = String(filePath);
        logger.debug(`Processing "${fp}"`);
        switch (path.extname(fp)) {
          case ".json":
            await processJson(fp, argv);
            break;
          case ".jpg":
            await processJpeg(fp, argv);
            break;
          default:
            logger.error(`Unrecognised extension: ${fp}`);
        }
      }
    }
  )
  .command(
    "audit",
    "Find photos with missing properties, orphan gallery links, duplicate originalFilenames, or operator-vs-geocoded country drift",
    (y) =>
      y
        .option("missing", {
          describe:
            "Restrict to a single missing-field check (default: run every check)",
          choices: [
            "taken",
            "coords",
            "place",
            "country",
            "author",
            "title",
            "description",
          ] as const,
        })
        .option("orphans", {
          type: "boolean",
          default: false,
          describe: "Restrict to the orphan-gallery-link check",
        })
        .option("duplicates", {
          type: "boolean",
          default: false,
          describe: "Restrict to the duplicate-originalFilename check",
        })
        .option("country-mismatch", {
          type: "boolean",
          default: false,
          describe:
            "Restrict to photos where operator country_code and geocoded_country_code disagree",
        })
        .option("missing-state-code", {
          type: "boolean",
          default: false,
          describe:
            "Restrict to photos with coords + city but no ISO 3166-2 geocoded_state_code",
        })
        .option("format", {
          choices: ["table", "ids"] as const,
          default: "table" as const,
          describe:
            "table (default, with id/originalFilename/taken) or ids (one per line, pipe-friendly)",
        }),
    async (argv) => {
      const photos = (await db.loadPhotos()) as any[];
      const orphanIds = new Set<string>(
        (await db.loadOrphanPhotoIds()) as string[]
      );

      const all = buildChecks(photos, orphanIds);
      const countryMismatch = argv["country-mismatch"];
      const missingStateCode = argv["missing-state-code"];
      const anyFilter =
        argv.missing !== undefined ||
        argv.orphans ||
        argv.duplicates ||
        countryMismatch ||
        missingStateCode;

      let selected: AuditCheck[];
      if (!anyFilter) {
        selected = all;
      } else {
        selected = [];
        if (argv.missing) {
          const key = `missing-${argv.missing}`;
          const match = all.find((c) => c.key === key);
          if (match) selected.push(match);
        }
        if (argv.orphans) {
          const match = all.find((c) => c.key === "orphans");
          if (match) selected.push(match);
        }
        if (argv.duplicates) {
          const match = all.find((c) => c.key === "duplicates");
          if (match) selected.push(match);
        }
        if (countryMismatch) {
          const match = all.find((c) => c.key === "country-mismatch");
          if (match) selected.push(match);
        }
        if (missingStateCode) {
          const match = all.find((c) => c.key === "missing-state-code");
          if (match) selected.push(match);
        }
      }

      if (argv.format === "table") {
        console.log(`Audited ${photos.length} photo(s).`);
      }
      for (const check of selected) {
        printCheck(check, check.rows(), argv.format);
      }
    }
  )
  .command(
    "search <originalFilename>",
    "List photos with a matching originalFilename (useful for collision triage)",
    (y) =>
      y.positional("originalFilename", {
        describe: "Original camera filename to search for (e.g. IMG_1234.jpg)",
        type: "string",
        demandOption: true,
      }),
    async (argv) => {
      const rows = (await db.loadPhotosByOriginalFilename(
        argv.originalFilename
      )) as any[];
      if (rows.length === 0) {
        console.log(`(no photos with originalFilename "${argv.originalFilename}")`);
        return;
      }
      const table: string[][] = [["id", "originalFilename", "taken"]];
      for (const r of rows) {
        table.push([
          r.id ?? "",
          r.originalFilename ?? "",
          r.taken?.instant?.timestamp ?? "",
        ]);
      }
      console.log(formatTable(table));
    }
  )
  .command(
    "audit-cities",
    "List unique (country, city) pairs in the gallery and whether each lang has an override in react-app/src/lib/translations/cities/. Helps target the per-language overlay against actual data.",
    (y) =>
      y.option("lang", {
        type: "array",
        string: true,
        default: ["fi", "ja"],
        describe: "Languages to check overrides for (default: fi, ja)",
      }),
    async (argv) => {
      const photos = (await db.loadPhotos()) as any[];
      const pairs = new Map<string, { country: string; cityEn: string }>();
      for (const p of photos) {
        const cc = p.geocoded?.countryCode as string | undefined;
        const cityEn = (p.geocoded?.cityEn ?? p.geocoded?.city) as
          | string
          | undefined;
        if (!cc || !cityEn) continue;
        const key = `${cc.toLowerCase()}:${cityEn}`;
        if (!pairs.has(key)) pairs.set(key, { country: cc, cityEn });
      }
      const overlayDir = path.resolve(
        path.dirname(new URL(import.meta.url).pathname),
        "../../react-app/src/lib/translations/cities"
      );
      const overlays: Record<string, Record<string, string>> = {};
      for (const lang of argv.lang as string[]) {
        const file = path.join(overlayDir, `${lang}.json`);
        overlays[lang] = fs.existsSync(file)
          ? (JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>)
          : {};
      }
      const header = ["country", "city (en)", ...(argv.lang as string[])];
      const rows: string[][] = [header];
      const missing: string[] = [];
      for (const key of [...pairs.keys()].sort()) {
        const { country, cityEn } = pairs.get(key)!;
        const cells = [country, cityEn];
        let anyMissing = false;
        for (const lang of argv.lang as string[]) {
          const v = overlays[lang]?.[key];
          if (v) cells.push(v);
          else {
            cells.push("—");
            anyMissing = true;
          }
        }
        rows.push(cells);
        if (anyMissing) missing.push(key);
      }
      console.log(formatTable(rows));
      console.log(
        `\n${pairs.size} unique (country, city) pair(s); ${missing.length} missing at least one override.`
      );
    }
  )
  .command(
    "cleanup-localized-cities",
    "Clear photo_localized.geocoded_city values that don't match their language's script rule (see server/lib/localized-script.ts). Sets the column to NULL — keeps the row + raw geocoded_address blob, so the daemon won't re-fetch and re-introduce the bad value. Dry-run by default; --apply to write.",
    (y) =>
      y
        .option("apply", {
          type: "boolean",
          default: false,
          describe: "Clear the matching values (default: dry-run, just print)",
        })
        .option("lang", {
          type: "array",
          string: true,
          describe: `Languages to check (default: all configured: ${RULED_LANGS.join(", ")})`,
        }),
    async (argv) => {
      const langs = (argv.lang as string[] | undefined) ?? RULED_LANGS;
      type Offender = { lang: string; photo_id: string; value: string };
      const offenders: Offender[] = [];
      for (const lang of langs) {
        const rows = (await db.loadPhotoLocalized(lang)) as Array<{
          photo_id: string;
          geocoded_city: string | null;
        }>;
        for (const r of rows) {
          if (r.geocoded_city && !acceptLocalizedCity(r.geocoded_city, lang)) {
            offenders.push({
              lang,
              photo_id: r.photo_id,
              value: r.geocoded_city,
            });
          }
        }
      }
      if (offenders.length === 0) {
        console.log("No photo_localized rows need cleanup.");
        return;
      }
      const table: string[][] = [["lang", "photo_id", "stored value"]];
      for (const o of offenders) table.push([o.lang, o.photo_id, o.value]);
      console.log(formatTable(table));
      console.log(
        `\n${offenders.length} row(s) ${argv.apply ? "cleared" : "would be cleared (dry-run, pass --apply to write)"}.`
      );
      if (argv.apply) {
        for (const o of offenders) {
          await db.clearLocalizedCity(o.photo_id, o.lang);
        }
      }
    }
  )
  .command(
    "normalize-cities",
    "Strip admin cruft from `photo.geocoded_city` (e.g. \"Stockholm Municipality\" → \"Stockholm\") using the current normalization rules. Dry-run by default; pass --apply to write.",
    (y) =>
      y.option("apply", {
        type: "boolean",
        default: false,
        describe: "Write the normalized values back to the DB (default: dry-run, just print)",
      }),
    async (argv) => {
      const photos = (await db.loadPhotos()) as any[];
      const changes: Array<{ id: string; raw: string; normalized: string }> = [];
      for (const photo of photos) {
        const raw = photo.geocoded?.city as string | undefined;
        if (!raw) continue;
        const normalized = normalizeCity(raw);
        if (normalized === raw) continue;
        changes.push({ id: photo.id, raw, normalized });
      }
      if (changes.length === 0) {
        console.log("No cities need normalization.");
        return;
      }
      const table: string[][] = [["id", "raw", "normalized"]];
      for (const c of changes) table.push([c.id, c.raw, c.normalized]);
      console.log(formatTable(table));
      console.log(
        `\n${changes.length} photo(s) ${argv.apply ? "updated" : "would be updated (dry-run, pass --apply to write)"}.`
      );
      if (argv.apply) {
        for (const c of changes) {
          await db.upsertGeocoded(c.id, "en", { city: c.normalized });
        }
      }
    }
  )
  .demandCommand(1, "Specify a subcommand or pass at least one file")
  .parseAsync();
