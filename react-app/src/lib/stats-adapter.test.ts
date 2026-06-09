import { describe, expect, test } from "vitest";

import { adaptServerStats } from "./stats-adapter";
import type { GalleryStats } from "../services/stats";

const emptyServer: GalleryStats = {
  total: 0,
  geotaggedCount: 0,
  byGallery: {},
  byCategory: {},
  byYearMonth: {},
  summary: {
    spanDays: 0,
    spanYears: 0,
    spanMonths: 0,
    peakShape: {},
    variety: {},
  },
  daysInYear: {},
  daysInYearMonth: {},
  byStateCountry: {},
  byCityCountry: {},
  byCityLocalized: {},
  categoryValues: {},
};

describe("adaptServerStats", () => {
  test("empty server response → empty client shape with safe defaults", () => {
    const out = adaptServerStats(emptyServer);
    expect(out.count.total).toBe(0);
    expect(out.count.byTime.byYear).toEqual({});
    expect(out.count.byTime.byMonth).toEqual({});
    expect(out.count.byTime.byWeekday).toEqual({});
    expect(out.count.byTime.byHour).toEqual({});
    expect(out.count.byTime.daysInYear).toEqual({});
    expect(out.count.byTime.daysInYearMonth).toEqual({});
    expect(out.count.byTime.minDate).toBeUndefined();
    expect(out.count.byTime.maxDate).toBeUndefined();
    expect(out.count.byTime.days).toBe(0);
    expect(out.count.byGear.byCamera).toEqual({});
    expect(out.count.byExposure.byAperture).toEqual({});
    expect(out.count.byAuthor).toEqual({});
    expect(out.count.byCountry).toEqual({});
  });

  test("populated server response maps category → nested client shape", () => {
    const server: GalleryStats = {
      ...emptyServer,
      total: 5,
      byCategory: {
        year: { "2024": 5 },
        month: { "5": 5 },
        weekday: { "1": 5 },
        hour: { "14": 5 },
        camera: { "FUJIFILM X-T5": 3, "Canon EOS R5": 2 },
        cameraMake: { FUJIFILM: 3, Canon: 2 },
        lens: { "Canon RF 50mm F1.8 STM": 2 },
        cameraLens: { '["FUJIFILM X-T5","Fujifilm XF27mmF2.8"]': 3 },
        focalLength: { "27": 3, "50": 2 },
        focalLength35mmEquiv: { "41": 3, "50": 2 },
        aperture: { "1.8": 2, "5.6": 3 },
        exposureTime: { "0.004": 5 },
        iso: { "200": 5 },
        ev: { "11": 5 },
        lv: { "12": 5 },
        resolution: { "24": 5 },
        orientation: { landscape: 5 },
        aspectRatio: { "3:2": 5 },
        author: { "Ville Misaki": 5 },
        country: { jp: 5 },
        state: { "jp-13": 5 },
        city: { '["jp","jp-13","Tokyo"]': 5 },
      },
      byYearMonth: { "2024": { "5": 5 } },
      daysInYear: { "2024": 366 },
      daysInYearMonth: { "2024": { "5": 31 } },
      byStateCountry: { "jp-13": "jp" },
      byCityCountry: { '["jp","jp-13","Tokyo"]': "jp" },
      byCityLocalized: { '["jp","jp-13","Tokyo"]': "東京" },
      summary: {
        ...emptyServer.summary,
        first: "2024-05-04",
        last: "2024-05-30",
        spanDays: 26,
      },
    };
    const out = adaptServerStats(server);
    expect(out.count.total).toBe(5);
    expect(out.count.byTime.byYear).toEqual({ "2024": 5 });
    expect(out.count.byTime.byYearMonth).toEqual({ "2024": { "5": 5 } });
    expect(out.count.byTime.minDate).toEqual({ year: 2024, month: 5, day: 4 });
    expect(out.count.byTime.maxDate).toEqual({ year: 2024, month: 5, day: 30 });
    expect(out.count.byTime.days).toBe(26);
    expect(out.count.byGear.byCamera).toEqual({
      "FUJIFILM X-T5": 3,
      "Canon EOS R5": 2,
    });
    expect(out.count.byGear.byCameraMake).toEqual({
      FUJIFILM: 3,
      Canon: 2,
    });
    expect(out.count.byExposure.byExposureValue).toEqual({ "11": 5 });
    expect(out.count.byExposure.byLightValue).toEqual({ "12": 5 });
    expect(out.count.byCity).toEqual({ '["jp","jp-13","Tokyo"]': 5 });
    expect(out.count.byCityLocalized).toEqual({
      '["jp","jp-13","Tokyo"]': "東京",
    });
    expect(out.count.byStateCountry).toEqual({ "jp-13": "jp" });
  });

  test("categoryValues universe pads filtered buckets with 0 counts", () => {
    const server: GalleryStats = {
      ...emptyServer,
      total: 1,
      byCategory: {
        country: { jp: 1 },
      },
      categoryValues: {
        country: ["fi", "jp", "us"],
      },
    };
    expect(adaptServerStats(server).count.byCountry).toEqual({
      fi: 0,
      jp: 1,
      us: 0,
    });
  });

  test("categoryValues missing for a category → only the filtered keys appear", () => {
    const server: GalleryStats = {
      ...emptyServer,
      byCategory: { country: { jp: 5 } },
      // No `country` key in categoryValues — older fixtures shouldn't crash.
    };
    expect(adaptServerStats(server).count.byCountry).toEqual({ jp: 5 });
  });

  test("ISO date parsing tolerates malformed strings (defensively undefined)", () => {
    const server = {
      ...emptyServer,
      summary: { ...emptyServer.summary, first: "not-a-date" },
    };
    expect(adaptServerStats(server).count.byTime.minDate).toBeUndefined();
  });
});
