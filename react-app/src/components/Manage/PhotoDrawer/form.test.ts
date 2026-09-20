import { describe, expect, test } from "vitest";

import {
  emptyForm,
  formatExposureTimeForInput,
  formFrom,
  parseExposureTime,
  patchFrom,
} from "./form";

describe("exposure time, as typed and as shown", () => {
  test.each([
    ["1/250", 0.004],
    ["1 / 250", 0.004],
    ["0.5", 0.5],
    ["2", 2],
    ["1.5/3", 0.5],
  ])("%s parses to %s seconds", (raw, seconds) => {
    expect(parseExposureTime(raw)).toBeCloseTo(seconds, 10);
  });

  test.each(["", "   ", "fast", "1/0"])("%j is no value", (raw) => {
    expect(parseExposureTime(raw)).toBeNull();
  });

  test("short exposures show as a fraction, long ones as seconds", () => {
    expect(formatExposureTimeForInput(0.004)).toBe("1/250");
    expect(formatExposureTimeForInput(2)).toBe("2");
    expect(formatExposureTimeForInput(0)).toBe("");
    expect(formatExposureTimeForInput(Number.NaN)).toBe("");
  });

  test("what is shown parses back to what was stored", () => {
    for (const seconds of [1 / 8000, 1 / 250, 1 / 30, 0.5, 1, 30]) {
      const shown = formatExposureTimeForInput(seconds);
      expect(parseExposureTime(shown)).toBeCloseTo(seconds, 6);
    }
  });
});

const photo = {
  id: "p.jpg",
  index: 0,
  title: "A title",
  taken: {
    instant: { year: 2024, month: 6, day: 1 },
    author: "Someone",
    location: {
      country: "jp",
      place: "Tokyo",
      coordinates: { latitude: 35.68, longitude: 139.76, altitude: null },
    },
  },
  camera: { make: "NIKON", model: "Z 6" },
  exposure: { focalLength: 35, aperture: 1.8, exposureTime: 0.004, iso: 100 },
  dimensions: { original: {}, thumbnail: {} },
};

describe("the patch an edit sends", () => {
  test("an untouched form sends nothing", () => {
    const form = formFrom(photo);
    expect(patchFrom(form, form)).toEqual({});
    expect(patchFrom(emptyForm(), emptyForm())).toEqual({});
  });

  test("a photo without optional text loads as empty fields", () => {
    const form = formFrom({ ...photo, title: undefined, taken: { instant: photo.taken.instant } });
    expect(form.title).toBe("");
    expect(form.author).toBe("");
    expect(form.place).toBe("");
    expect(form.latitude).toBe("");
  });

  test("only what changed is sent, trimmed", () => {
    const original = formFrom(photo);
    const patch = patchFrom(original, { ...original, title: "  New title ", iso: "200" });
    expect(patch).toEqual({ title: "New title", exposure: { iso: 200 } });
  });

  test("whitespace alone is not a change", () => {
    const original = formFrom(photo);
    expect(patchFrom(original, { ...original, title: "A title  " })).toEqual({});
  });

  test("a new exposure time is sent in seconds", () => {
    const original = formFrom(photo);
    const patch = patchFrom(original, { ...original, exposureTime: "1/500" });
    expect(patch.exposure?.exposureTime).toBeCloseTo(0.002, 10);
  });

  test("moving the pin sends only the axis that moved", () => {
    const original = formFrom(photo);
    const patch = patchFrom(original, { ...original, latitude: "35.7" });
    expect(patch).toEqual({ taken: { location: { coordinates: { latitude: 35.7 } } } });
  });
});
