#!/usr/bin/env -S npx tsx
/* eslint-disable @typescript-eslint/no-explicit-any, no-console -- interactive CLI tool; console output is the UI */
import fs from "node:fs";
import path from "node:path";

import yargs, { type Argv } from "yargs";
import { hideBin } from "yargs/helpers";

import logger from "../lib/logger.js";
import db from "../db/index.js";
import {
  acceptLocalizedCity,
  RULED_LANGS,
} from "../lib/localized-script.js";
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

const setGalleries = async (photoId: string, galleries: unknown) => {
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

const overrideOptionKeys = [
  "title",
  "description",
  "country",
  "author",
  "place",
  "camera-make",
  "camera-model",
  "lens-make",
  "lens-model",
  "focal",
  "aperture",
] as const;

const buildPatchFromArgv = (argv: any): any => {
  const patch: any = {};
  if ("title" in argv) patch.title = argv.title;
  if ("description" in argv) patch.description = argv.description;
  if ("author" in argv) {
    patch.taken = patch.taken || {};
    patch.taken.author = argv.author;
  }
  if ("country" in argv) {
    patch.taken = patch.taken || {};
    patch.taken.location = patch.taken.location || {};
    patch.taken.location.country = argv.country;
  }
  if ("place" in argv) {
    patch.taken = patch.taken || {};
    patch.taken.location = patch.taken.location || {};
    patch.taken.location.place = argv.place;
  }
  if ("camera-make" in argv) {
    patch.camera = patch.camera || {};
    patch.camera.make = argv["camera-make"];
  }
  if ("camera-model" in argv) {
    patch.camera = patch.camera || {};
    patch.camera.model = argv["camera-model"];
  }
  if ("lens-make" in argv) {
    patch.lens = patch.lens || {};
    patch.lens.make = argv["lens-make"];
  }
  if ("lens-model" in argv) {
    patch.lens = patch.lens || {};
    patch.lens.model = argv["lens-model"];
  }
  if ("focal" in argv) {
    patch.exposure = patch.exposure || {};
    patch.exposure.focalLength = argv.focal;
  }
  if ("aperture" in argv) {
    patch.exposure = patch.exposure || {};
    patch.exposure.aperture = argv.aperture;
  }
  return patch;
};

const applyOverrideOptions = (y: Argv) =>
  y
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
    .option("aperture", { type: "number", describe: "Aperture value (f-number)" });

// ---- audit ---------------------------------------------------------------

// Predicates live in server/lib/photo-filter.ts so the CLI and the
// admin photos endpoint share the same definitions.
import { MISSING_PREDICATES, type MissingField } from "../lib/photo-filter.js";

interface AuditCheck {
  key: string;
  title: string;
  rows: () => Array<{ id: string; row: any; why?: string }>;
  whyLabel?: string;
  footer?: () => string | undefined;
}

const FIELDS_FOR_CLI: MissingField[] = [
  "taken",
  "coords",
  "place",
  "country",
  "author",
  "title",
  "description",
];

const buildChecks = (
  photos: any[],
  orphanIds: Set<string>
): AuditCheck[] => {
  const checks: AuditCheck[] = [];

  for (const field of FIELDS_FOR_CLI) {
    const probe = MISSING_PREDICATES[field];
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
      const probe = MISSING_PREDICATES["state-code"];
      const out: Array<{ id: string; row: any; why?: string }> = [];
      for (const p of photos) {
        if (!probe(p)) continue;
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
  format: "table" | "ids",
  detail: boolean
): void => {
  if (format === "ids") {
    for (const r of results) console.log(r.id);
    return;
  }
  console.log(`\n${check.title}: ${results.length}`);
  if (detail && results.length > 0) {
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
    "show <id>",
    "Print a photo row as pretty JSON",
    (y) =>
      y
        .positional("id", {
          describe: "Photo id",
          type: "string",
          demandOption: true,
        })
        .option("lang", {
          type: "string",
          describe:
            "Apply per-language overlay for localized fields (default: en, the canonical row)",
        }),
    async (argv) => {
      const photo = await db.loadPhoto(argv.id, argv.lang).catch(() => null);
      if (!photo) {
        console.error(`✗ Photo "${argv.id}" doesn't exist.`);
        process.exit(1);
      }
      console.log(JSON.stringify(photo, null, 2));
    }
  )
  .command(
    "update <id>",
    "Modify operator-set fields on an existing photo. Pass only the flags you want to change; the rest of the row stays as-is.",
    (y) =>
      applyOverrideOptions(
        y.positional("id", {
          describe: "Photo id",
          type: "string",
          demandOption: true,
        })
      ).option("gallery", {
        describe:
          "Replace gallery membership (repeat for multiple). Without this flag, gallery links stay as-is.",
        type: "array",
        string: true,
      }),
    async (argv) => {
      const id = argv.id as string;
      const existing = await db.loadPhoto(id).catch(() => null);
      if (!existing) {
        console.error(`✗ Photo "${id}" doesn't exist.`);
        process.exit(1);
      }
      const patch = buildPatchFromArgv(argv);
      const anyField = Object.keys(patch).length > 0;
      const anyGallery = argv.gallery !== undefined;
      if (!anyField && !anyGallery) {
        console.error(
          `(nothing to do — pass at least one of: --${overrideOptionKeys.join(", --")}, --gallery)`
        );
        process.exit(1);
      }
      if (anyField) {
        await db.updatePhoto(id, patch);
        console.log(`✓ Updated "${id}".`);
      }
      await setGalleries(id, argv.gallery);
    }
  )
  .command(
    "delete <id>",
    "Delete a photo row. Files on disk (photos/{original,display,thumbnail}/<id>.*) are NOT touched.",
    (y) =>
      y.positional("id", {
        describe: "Photo id",
        type: "string",
        demandOption: true,
      }),
    async (argv) => {
      const existing = await db.loadPhoto(argv.id).catch(() => null);
      if (!existing) {
        console.error(`✗ Photo "${argv.id}" doesn't exist.`);
        process.exit(1);
      }
      await db.deletePhoto(argv.id);
      console.log(`✓ Deleted "${argv.id}".`);
    }
  )
  .command(
    "audit",
    "Find photos with missing properties, orphan gallery links, duplicate originalFilenames, or operator-vs-geocoded country drift. Default: counts-only summary across every check. Pass --detail or any restricting flag to surface the item rows.",
    (y) =>
      y
        .option("missing", {
          describe:
            "Restrict to a single missing-field check + show rows (default: counts only across every check). `state-code` reports only photos that have coords + city but no ISO 3166-2 code.",
          choices: [
            "taken",
            "coords",
            "place",
            "country",
            "author",
            "title",
            "description",
            "state-code",
          ] as const,
        })
        .option("orphans", {
          type: "boolean",
          default: false,
          describe: "Restrict to the orphan-gallery-link check + show rows",
        })
        .option("duplicates", {
          type: "boolean",
          default: false,
          describe:
            "Restrict to the duplicate-originalFilename check + show rows",
        })
        .option("country-mismatch", {
          type: "boolean",
          default: false,
          describe:
            "Restrict to photos where operator country_code and geocoded_country_code disagree + show rows",
        })
        .option("detail", {
          type: "boolean",
          default: false,
          describe:
            "Show row tables for every check (the pre-0.12 default behaviour)",
        })
        .option("format", {
          choices: ["table", "ids"] as const,
          default: "table" as const,
          describe:
            "table (default, with id/originalFilename/taken) or ids (one per line, pipe-friendly — always emits all matching ids regardless of --detail)",
        }),
    async (argv) => {
      const photos = (await db.loadPhotos()) as any[];
      const orphanIds = new Set<string>(
        (await db.loadOrphanPhotoIds()) as string[]
      );

      const all = buildChecks(photos, orphanIds);
      const countryMismatch = argv["country-mismatch"];
      const anyFilter =
        argv.missing !== undefined ||
        argv.orphans ||
        argv.duplicates ||
        countryMismatch;

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
      }

      // Item rows surface when the operator either narrowed to a
      // specific check or asked for --detail explicitly. The bare
      // `audit` invocation now reads as a one-screen summary across
      // every check — most checks return 0 once a gallery is settled,
      // and the wall-of-rows default was noise for the common case.
      // ids format ignores this — pipe-friendly mode always emits.
      const detail = argv.format === "ids" || argv.detail || anyFilter;

      if (argv.format === "table") {
        console.log(`Audited ${photos.length} photo(s).`);
      }
      for (const check of selected) {
        printCheck(check, check.rows(), argv.format, detail);
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
    "cities",
    "Manage geocoded city data — audit per-language overlay coverage, normalize, or clean bad localized values.",
    (y) =>
      y
        .command(
          "audit",
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
                ? (JSON.parse(fs.readFileSync(file, "utf8")) as Record<
                    string,
                    string
                  >)
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
          "normalize",
          "Strip admin cruft from `photo.geocoded_city` (e.g. \"Stockholm Municipality\" → \"Stockholm\") using the current normalization rules. Dry-run by default; pass --apply to write.",
          (y) =>
            y.option("apply", {
              type: "boolean",
              default: false,
              describe:
                "Write the normalized values back to the DB (default: dry-run, just print)",
            }),
          async (argv) => {
            const photos = (await db.loadPhotos()) as any[];
            const changes: Array<{ id: string; raw: string; normalized: string }> =
              [];
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
        .command(
          "clean-localized",
          "Clear photo_localized.geocoded_city values that don't match their language's script rule (see server/lib/localized-script.ts). Sets the column to NULL — keeps the row + raw geocoded_address blob, so the daemon won't re-fetch and re-introduce the bad value. Dry-run by default; --apply to write.",
          (y) =>
            y
              .option("apply", {
                type: "boolean",
                default: false,
                describe:
                  "Clear the matching values (default: dry-run, just print)",
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
                if (
                  r.geocoded_city &&
                  !acceptLocalizedCity(r.geocoded_city, lang)
                ) {
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
        .demandCommand(
          1,
          "Choose an action: audit, normalize, or clean-localized"
        )
  )
  .demandCommand(1, "Specify a subcommand")
  .parseAsync();
