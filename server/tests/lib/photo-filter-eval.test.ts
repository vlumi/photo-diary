import { describe, expect, test } from "vitest";

import type { Photo } from "../../db/sqlite3/schema.js";
import {
  matchesFilter,
  matchesNumericRanges,
  type FilterShape,
  type NumericRanges,
} from "../../lib/photo-filter-eval.js";

// Compact factory: every test starts from a baseline photo and
// overrides the slice it cares about. `instant` is set to a known
// 2024-03-15 (a Friday) at 14:30:00 so weekday / hour tests don't
// have to thread date arithmetic.
const makePhoto = (overrides: Partial<Photo> = {}): Photo => {
  const base: Photo = {
    id: "test.jpg",
    originalFilename: "test.jpg",
    index: 0,
    title: "",
    description: "",
    taken: {
      instant: {
        timestamp: "2024-03-15 14:30:00",
        year: 2024,
        month: 3,
        day: 15,
        hour: 14,
        minute: 30,
        second: 0,
      },
      author: "Ville Misaki",
      location: {
        country: "jp",
        place: "",
        coordinates: { latitude: 35.66, longitude: 139.7, altitude: null },
      },
    },
    camera: { make: "FUJIFILM", model: "X-T5", serial: "" },
    lens: { make: "FUJIFILM", model: "XF27mmF2.8", serial: "" },
    exposure: {
      focalLength: 27,
      focalLength35mmEquiv: 41,
      aperture: 5.6,
      exposureTime: 1 / 250,
      iso: 200,
    },
    dimensions: {
      original: { width: 6000, height: 4000 },
      display: { width: 1500, height: 1000 },
      thumbnail: { width: 150, height: 100 },
    },
    geocoded: {
      countryCode: "jp",
      stateCode: "jp-13",
      city: "Tokyo",
      cityEn: "Tokyo",
      address: undefined,
      noData: false,
    },
    exifAtIntake: undefined,
  };
  return { ...base, ...overrides };
};

describe("matchesFilter", () => {
  test("no filter / empty filter → match", () => {
    const photo = makePhoto();
    expect(matchesFilter(undefined, photo)).toBe(true);
    expect(matchesFilter(null, photo)).toBe(true);
    expect(matchesFilter({}, photo)).toBe(true);
  });

  test("empty category array → category skipped", () => {
    const photo = makePhoto();
    const filter: FilterShape = { general: { country: [] } };
    expect(matchesFilter(filter, photo)).toBe(true);
  });

  test("OR within category — any matching key passes", () => {
    const photo = makePhoto({
      taken: { ...makePhoto().taken, location: { ...makePhoto().taken.location, country: "fi" } },
    });
    const filter: FilterShape = {
      general: { country: ["jp", "fi", "us"] },
    };
    expect(matchesFilter(filter, photo)).toBe(true);
  });

  test("AND across categories — both must match", () => {
    const photo = makePhoto();
    expect(
      matchesFilter(
        { general: { country: ["jp"] }, time: { year: ["2024"] } },
        photo
      )
    ).toBe(true);
    expect(
      matchesFilter(
        { general: { country: ["jp"] }, time: { year: ["2023"] } },
        photo
      )
    ).toBe(false);
  });

  test("AND across topics — every topic gates", () => {
    const photo = makePhoto();
    expect(
      matchesFilter(
        { general: { country: ["us"] }, time: { year: ["2024"] } },
        photo
      )
    ).toBe(false);
  });
});

describe("predicates", () => {
  test("author matches by string equality", () => {
    expect(
      matchesFilter({ general: { author: ["Ville Misaki"] } }, makePhoto())
    ).toBe(true);
    expect(
      matchesFilter({ general: { author: ["Someone Else"] } }, makePhoto())
    ).toBe(false);
  });

  test("author null key matches photos with empty author", () => {
    const photo = makePhoto({
      taken: { ...makePhoto().taken, author: "" },
    });
    expect(matchesFilter({ general: { author: [null] } }, photo)).toBe(true);
  });

  test("country / state / city all key off the geocoded / taken shape", () => {
    const photo = makePhoto();
    expect(matchesFilter({ general: { country: ["jp"] } }, photo)).toBe(true);
    expect(matchesFilter({ general: { state: ["jp-13"] } }, photo)).toBe(true);
    expect(
      matchesFilter(
        { general: { city: ['["jp","jp-13","Tokyo"]'] } },
        photo
      )
    ).toBe(true);
  });

  test("geotagged true / false on the wire", () => {
    const geotagged = makePhoto();
    const orphan = makePhoto({
      taken: {
        ...makePhoto().taken,
        location: { country: "", place: "", coordinates: { latitude: null, longitude: null, altitude: null } },
      },
    });
    expect(matchesFilter({ general: { geotagged: [true] } }, geotagged)).toBe(true);
    expect(matchesFilter({ general: { geotagged: [false] } }, geotagged)).toBe(false);
    expect(matchesFilter({ general: { geotagged: [false] } }, orphan)).toBe(true);
  });

  test("year / month / hour accept string or numeric keys", () => {
    const photo = makePhoto();
    expect(matchesFilter({ time: { year: ["2024"] } }, photo)).toBe(true);
    expect(matchesFilter({ time: { year: [2024] } }, photo)).toBe(true);
    expect(matchesFilter({ time: { month: ["3"] } }, photo)).toBe(true);
    expect(matchesFilter({ time: { hour: ["14"] } }, photo)).toBe(true);
  });

  test("year-month is the dash-joined string", () => {
    const photo = makePhoto();
    expect(
      matchesFilter({ time: { "year-month": ["2024-3"] } }, photo)
    ).toBe(true);
  });

  test("weekday uses the same getDay() convention (2024-03-15 = Friday/5)", () => {
    expect(
      matchesFilter({ time: { weekday: [5] } }, makePhoto())
    ).toBe(true);
  });

  test("camera + lens use the formatGear concat", () => {
    const photo = makePhoto();
    expect(
      matchesFilter({ gear: { camera: ["FUJIFILM X-T5"] } }, photo)
    ).toBe(true);
    expect(
      matchesFilter({ gear: { lens: ["FUJIFILM XF27mmF2.8"] } }, photo)
    ).toBe(true);
  });

  test("camera-lens pair JSON match", () => {
    expect(
      matchesFilter(
        {
          gear: {
            "camera-lens": ['["FUJIFILM X-T5","FUJIFILM XF27mmF2.8"]'],
          },
        },
        makePhoto()
      )
    ).toBe(true);
  });

  test("camera-lens with null lens (= no lens) matches a no-lens photo", () => {
    const noLens = makePhoto({ lens: { make: "", model: "", serial: "" } });
    expect(
      matchesFilter(
        {
          gear: { "camera-lens": ['["FUJIFILM X-T5",null]'] },
        },
        noLens
      )
    ).toBe(true);
    expect(
      matchesFilter(
        {
          gear: { "camera-lens": ['["FUJIFILM X-T5",null]'] },
        },
        makePhoto()
      )
    ).toBe(false);
  });

  test("focal-length numeric match", () => {
    expect(
      matchesFilter({ settings: { "focal-length": ["27"] } }, makePhoto())
    ).toBe(true);
  });

  test("focal-length-eq falls back to crop-factor when EXIF is missing", () => {
    const photo = makePhoto({
      camera: { make: "FUJIFILM", model: "X100F", serial: "" },
      exposure: { ...makePhoto().exposure, focalLength: 23, focalLength35mmEquiv: undefined },
    });
    expect(
      matchesFilter({ settings: { "focal-length-eq": ["35"] } }, photo)
    ).toBe(true);
  });

  test("aperture / exposure-time / iso", () => {
    expect(
      matchesFilter({ settings: { aperture: ["5.6"] } }, makePhoto())
    ).toBe(true);
    expect(
      matchesFilter(
        { settings: { "exposure-time": [1 / 250] } },
        makePhoto()
      )
    ).toBe(true);
    expect(
      matchesFilter({ settings: { iso: ["200"] } }, makePhoto())
    ).toBe(true);
  });

  test("ev / lv derived values", () => {
    const photo = makePhoto();
    // f/5.6 @ 1/250 → EV = log2(31.36 * 250) ≈ 12.93 → 13
    expect(matchesFilter({ light: { ev: ["13"] } }, photo)).toBe(true);
    // ISO 200 → LV = EV + log2(2) = 14
    expect(matchesFilter({ light: { lv: ["14"] } }, photo)).toBe(true);
  });

  test("resolution as megapixels", () => {
    expect(
      matchesFilter({ image: { resolution: ["24"] } }, makePhoto())
    ).toBe(true);
  });

  test("orientation + aspect-ratio", () => {
    expect(
      matchesFilter({ image: { orientation: ["landscape"] } }, makePhoto())
    ).toBe(true);
    expect(
      matchesFilter({ image: { "aspect-ratio": ["3:2"] } }, makePhoto())
    ).toBe(true);
  });

  test("unknown category drops the dimension (forward compat)", () => {
    const photo = makePhoto();
    expect(
      matchesFilter(
        { future: { "new-category": ["whatever"] } } as unknown as FilterShape,
        photo
      )
    ).toBe(true);
  });
});

describe("null = <unknown> bucket", () => {
  test("country null matches a no-country photo", () => {
    const photo = makePhoto({
      taken: {
        ...makePhoto().taken,
        location: { ...makePhoto().taken.location, country: undefined },
      },
    });
    expect(matchesFilter({ general: { country: [null] } }, photo)).toBe(true);
  });

  test("focal-length null matches a no-EXIF photo", () => {
    const photo = makePhoto({
      exposure: { ...makePhoto().exposure, focalLength: undefined },
    });
    expect(
      matchesFilter({ settings: { "focal-length": [null] } }, photo)
    ).toBe(true);
  });

  test("a specific value does NOT match an <unknown> photo", () => {
    const photo = makePhoto({
      taken: {
        ...makePhoto().taken,
        location: { ...makePhoto().taken.location, country: undefined },
      },
    });
    expect(matchesFilter({ general: { country: ["jp"] } }, photo)).toBe(false);
  });
});

describe("matchesNumericRanges", () => {
  test("no ranges / empty ranges → match", () => {
    const photo = makePhoto();
    expect(matchesNumericRanges(undefined, photo)).toBe(true);
    expect(matchesNumericRanges(null, photo)).toBe(true);
    expect(matchesNumericRanges({}, photo)).toBe(true);
  });

  test("entry with no bounds → category skipped", () => {
    const photo = makePhoto();
    const ranges: NumericRanges = { "focal-length": {} };
    expect(matchesNumericRanges(ranges, photo)).toBe(true);
  });

  test("focal-length within range → match", () => {
    const photo = makePhoto(); // focalLength: 27
    expect(
      matchesNumericRanges({ "focal-length": { min: 10, max: 200 } }, photo)
    ).toBe(true);
    expect(
      matchesNumericRanges({ "focal-length": { min: 27, max: 27 } }, photo)
    ).toBe(true);
    expect(
      matchesNumericRanges({ "focal-length": { min: 27 } }, photo)
    ).toBe(true);
    expect(
      matchesNumericRanges({ "focal-length": { max: 27 } }, photo)
    ).toBe(true);
  });

  test("focal-length outside range → no match", () => {
    const photo = makePhoto(); // focalLength: 27
    expect(
      matchesNumericRanges({ "focal-length": { min: 50, max: 200 } }, photo)
    ).toBe(false);
    expect(
      matchesNumericRanges({ "focal-length": { max: 20 } }, photo)
    ).toBe(false);
  });

  test("aperture / iso / exposure-time / ev / lv all evaluate", () => {
    const photo = makePhoto(); // aperture 5.6, iso 200, exposureTime 1/250
    expect(
      matchesNumericRanges({ aperture: { min: 5.6, max: 5.6 } }, photo)
    ).toBe(true);
    expect(
      matchesNumericRanges({ iso: { min: 100, max: 400 } }, photo)
    ).toBe(true);
    expect(
      matchesNumericRanges(
        { "exposure-time": { min: 1 / 500, max: 1 / 100 } },
        photo
      )
    ).toBe(true);
    expect(
      matchesNumericRanges({ aperture: { min: 8 } }, photo)
    ).toBe(false);
  });

  test("AND across categories — all must match", () => {
    const photo = makePhoto(); // focalLength 27, aperture 5.6
    expect(
      matchesNumericRanges(
        {
          "focal-length": { min: 10, max: 50 },
          aperture: { min: 4, max: 8 },
        },
        photo
      )
    ).toBe(true);
    expect(
      matchesNumericRanges(
        {
          "focal-length": { min: 10, max: 50 },
          aperture: { min: 8 },
        },
        photo
      )
    ).toBe(false);
  });

  test("missing photo value → no match (treated as out-of-range)", () => {
    const photo = makePhoto({
      exposure: {
        focalLength: undefined,
        focalLength35mmEquiv: undefined,
        aperture: undefined,
        exposureTime: undefined,
        iso: undefined,
      },
    });
    expect(
      matchesNumericRanges({ "focal-length": { min: 10, max: 200 } }, photo)
    ).toBe(false);
  });

  test("unknown category → drops the dimension (forward-compat)", () => {
    const photo = makePhoto();
    expect(
      matchesNumericRanges({ "future-thing": { min: 1, max: 10 } }, photo)
    ).toBe(false);
  });
});
