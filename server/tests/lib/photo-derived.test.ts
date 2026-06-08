import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  ASPECT_RATIOS,
  aspectRatio,
  exposureValue,
  focalLength35mmEquiv,
  formatGear,
  lightValue,
  orientation,
  resolution,
  weekday,
} from "../../lib/photo-derived.js";

describe("formatGear", () => {
  test("both undefined → undefined", () => {
    expect(formatGear()).toBeUndefined();
    expect(formatGear(undefined, undefined)).toBeUndefined();
    expect(formatGear(null, null)).toBeUndefined();
  });
  test("only make → make", () => {
    expect(formatGear("Fujifilm", undefined)).toBe("Fujifilm");
  });
  test("only model → model", () => {
    expect(formatGear(undefined, "X-T5")).toBe("X-T5");
  });
  test("model starts with make → model (avoids 'Fujifilm Fujifilm X-T5')", () => {
    expect(formatGear("Fujifilm", "Fujifilm X-T5")).toBe("Fujifilm X-T5");
  });
  test("both, no prefix overlap → joined", () => {
    expect(formatGear("Canon", "EOS R5")).toBe("Canon EOS R5");
  });
});

describe("focalLength35mmEquiv", () => {
  test("explicit value wins", () => {
    expect(focalLength35mmEquiv(50, "Fujifilm", "X-T5", 75)).toBe(75);
  });
  test("no focal length → undefined", () => {
    expect(focalLength35mmEquiv(undefined, "FUJIFILM", "X100F")).toBeUndefined();
  });
  test("known body in crop-factors.json → derived (X100F = 1.5)", () => {
    expect(focalLength35mmEquiv(23, "FUJIFILM", "X100F")).toBe(35);
  });
  test("unknown body → undefined (no faking)", () => {
    expect(focalLength35mmEquiv(50, "Sony", "A7 IV")).toBeUndefined();
  });
  test("full-frame body in crop-factors (factor 1.0) → input passthrough", () => {
    expect(
      focalLength35mmEquiv(35, "Canon", "Canon EOS 5D Mark II")
    ).toBe(35);
  });
});

describe("exposureValue (EV)", () => {
  test("missing inputs → undefined", () => {
    expect(exposureValue(undefined, 0.001)).toBeUndefined();
    expect(exposureValue(2.8, undefined)).toBeUndefined();
  });
  test("f/2.8 @ 1/250 ≈ 11", () => {
    expect(exposureValue(2.8, 1 / 250)).toBe(11);
  });
  test("rounded to nearest 0.5", () => {
    const ev = exposureValue(5.6, 1 / 60);
    expect(ev).toBeDefined();
    expect((ev! * 2) % 1).toBe(0);
  });
});

describe("lightValue (LV)", () => {
  test("missing ISO → undefined", () => {
    expect(lightValue(2.8, 1 / 250, undefined)).toBeUndefined();
  });
  test("ISO 100 → LV equals EV", () => {
    const ev = exposureValue(2.8, 1 / 250);
    const lv = lightValue(2.8, 1 / 250, 100);
    expect(lv).toBe(ev);
  });
  test("ISO 200 → LV = EV - 1 (one stop brighter scene needs same exposure)", () => {
    const ev = exposureValue(5.6, 1 / 125)!;
    const lv = lightValue(5.6, 1 / 125, 200)!;
    expect(lv).toBeCloseTo(ev + 1, 5);
  });
});

describe("resolution", () => {
  test("6000 × 4000 → 24 MP", () => {
    expect(resolution(6000, 4000)).toBe(24);
  });
  test("missing dimensions → 0", () => {
    expect(resolution(undefined, 4000)).toBe(0);
    expect(resolution(6000, 0)).toBe(0);
  });
});

describe("orientation", () => {
  test("3:2 → landscape", () => {
    expect(orientation(6000, 4000)).toBe("landscape");
  });
  test("2:3 → portrait", () => {
    expect(orientation(4000, 6000)).toBe("portrait");
  });
  test("1:1 → square", () => {
    expect(orientation(1000, 1000)).toBe("square");
  });
  test("near-1:1 within 1% → square", () => {
    expect(orientation(1005, 1000)).toBe("square");
  });
  test("missing dims → landscape (matches client's default)", () => {
    expect(orientation(undefined, undefined)).toBe("landscape");
  });
});

describe("aspectRatio", () => {
  test("6000 × 4000 → 3:2", () => {
    expect(aspectRatio(6000, 4000)).toBe("3:2");
  });
  test("4000 × 6000 → 3:2 (long-over-short normalisation)", () => {
    expect(aspectRatio(4000, 6000)).toBe("3:2");
  });
  test("1920 × 1080 → 16:9", () => {
    expect(aspectRatio(1920, 1080)).toBe("16:9");
  });
  test("1000 × 1000 → 1:1", () => {
    expect(aspectRatio(1000, 1000)).toBe("1:1");
  });
  test("missing dims → undefined", () => {
    expect(aspectRatio(0, 1000)).toBeUndefined();
    expect(aspectRatio(1000, undefined)).toBeUndefined();
  });
  test("very wide → 3:1+ catch-all", () => {
    expect(aspectRatio(6000, 1000)).toBe("3:1+");
  });
});

describe("weekday", () => {
  test("2024-01-01 → Monday (1)", () => {
    expect(weekday(2024, 1, 1)).toBe(1);
  });
  test("2024-12-08 → Sunday (0)", () => {
    expect(weekday(2024, 12, 8)).toBe(0);
  });
});

// Constants drift between server-side photo-derived.ts and the
// client-side PhotoModel.ts would silently produce different
// stats buckets for the same photo. Read both source files via
// fs and assert the aspect-ratio table matches verbatim; if the
// list ever changes, both sides bump together.
describe("client parity", () => {
  const HERE = path.dirname(new URL(import.meta.url).pathname);
  const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
  const CLIENT_PHOTO_MODEL = path.join(
    REPO_ROOT,
    "react-app",
    "src",
    "models",
    "PhotoModel.ts"
  );

  test("ASPECT_RATIOS matches the client list verbatim", () => {
    const source = fs.readFileSync(CLIENT_PHOTO_MODEL, "utf8");
    // Grab the inline aspectRatios array inside aspectRatio() and
    // extract each `{ name: "...", ratio: <expr> }` row.
    const arrayMatch = source.match(
      /const aspectRatios = \[\s*([\s\S]*?)\s*\];/
    );
    expect(arrayMatch).not.toBeNull();
    const rows = [
      ...arrayMatch![1].matchAll(
        /\{\s*name:\s*"([^"]+)",\s*ratio:\s*([^,}\n]+?)\s*\}/g
      ),
    ];
    expect(rows.length).toBe(ASPECT_RATIOS.length);
    rows.forEach((row, i) => {
      expect(row[1]).toBe(ASPECT_RATIOS[i].name);
      const clientRatio = eval(row[2]) as number;
      expect(clientRatio).toBeCloseTo(ASPECT_RATIOS[i].ratio, 10);
    });
  });

  test("crop-factors.json matches the client copy", () => {
    const serverPath = path.join(REPO_ROOT, "server", "lib", "crop-factors.json");
    const clientPath = path.join(
      REPO_ROOT,
      "react-app",
      "src",
      "lib",
      "crop-factors.json"
    );
    const server = JSON.parse(fs.readFileSync(serverPath, "utf8"));
    const client = JSON.parse(fs.readFileSync(clientPath, "utf8"));
    expect(server).toEqual(client);
  });
});
