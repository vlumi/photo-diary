// Adapter from the server stats response (`/galleries/:id/stats`)
// to the in-memory `data` shape `collectTopics` consumes.
//
// `collectTopics` was originally fed by the client-side
// `collectStatistics(photos, uniqueValues)` walk. With the bucket
// aggregation moved to the server, this adapter does the
// mechanical 1:1 rename from the server's flat `byCategory.<key>`
// onto the nested `count.byTime` / `byGear` / `byExposure` /
// flat-ish account / country fields the rendering code expects.
// Lets the entire `collectTopics` + Topic / Category / Charts /
// Table / Summary tree stay untouched.

import type { GalleryStats } from "../services/stats";

type Counts = Record<string, number>;
type YearMonthCounts = Record<string, Record<string, number>>;

const emptyCounts: Counts = {};
const emptyYearMonth: YearMonthCounts = {};

// Pad the filtered bucket map with zeros for every key in the
// universe (computed by the server from the full unfiltered
// gallery). Lets the filter UI surface "add this value" chips for
// rows the active filter is currently excluding — multi-select
// unions still need every possible value reachable from a click.
const padWithUniverse = (
  filtered: Counts | undefined,
  universe: string[] | undefined
): Counts => {
  const out: Counts = {};
  if (universe) {
    for (const key of universe) out[key] = 0;
  }
  if (filtered) {
    for (const [key, value] of Object.entries(filtered)) out[key] = value;
  }
  return out;
};

// Server emits ISO date strings ("2018-05-04"); the client's
// summary code wants `{ year, month, day }` numerics.
const parseIsoDate = (
  iso: string | undefined
): { year: number; month: number; day: number } | undefined => {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map((n) => Number(n));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return undefined;
  }
  return { year: y, month: m, day: d };
};

export interface ClientStatsData {
  count: {
    total: number;
    geotaggedCount: number;
    byTime: {
      byYear: Counts;
      byYearMonth: YearMonthCounts;
      byMonth: Counts;
      byWeekday: Counts;
      byHour: Counts;
      daysInYear: Counts;
      daysInYearMonth: YearMonthCounts;
      // Earliest / latest photo dates + the span between them,
      // expressed as the simple numeric triple the summary code
      // already walks.
      minDate?: { year: number; month: number; day: number };
      maxDate?: { year: number; month: number; day: number };
      days: number;
    };
    byExposure: {
      byFocalLength: Counts;
      byFocalLength35mmEquiv: Counts;
      byAperture: Counts;
      byExposureTime: Counts;
      byIso: Counts;
      byExposureValue: Counts;
      byLightValue: Counts;
      byResolution: Counts;
      byOrientation: Counts;
      byAspectRatio: Counts;
    };
    byGear: {
      byCameraMake: Counts;
      byCamera: Counts;
      byLens: Counts;
      byCameraLens: Counts;
    };
    byAuthor: Counts;
    byCountry: Counts;
    byState: Counts;
    byStateCountry: Record<string, string>;
    byCity: Counts;
    byCityCountry: Record<string, string>;
    byCityLocalized: Record<string, string>;
  };
}

export const adaptServerStats = (server: GalleryStats): ClientStatsData => {
  const cv = server.categoryValues ?? {};
  const pad = (category: string): Counts =>
    padWithUniverse(server.byCategory[category], cv[category]);
  return {
    count: {
      total: server.total,
      geotaggedCount: server.geotaggedCount ?? 0,
      byTime: {
        byYear: pad("year"),
        byYearMonth: server.byYearMonth ?? emptyYearMonth,
        byMonth: pad("month"),
        byWeekday: pad("weekday"),
        byHour: pad("hour"),
        daysInYear: server.daysInYear ?? emptyCounts,
        daysInYearMonth: server.daysInYearMonth ?? emptyYearMonth,
        minDate: parseIsoDate(server.summary.first),
        maxDate: parseIsoDate(server.summary.last),
        days: server.summary.spanDays,
      },
      byExposure: {
        byFocalLength: pad("focalLength"),
        byFocalLength35mmEquiv: pad("focalLength35mmEquiv"),
        byAperture: pad("aperture"),
        byExposureTime: pad("exposureTime"),
        byIso: pad("iso"),
        byExposureValue: pad("ev"),
        byLightValue: pad("lv"),
        byResolution: pad("resolution"),
        byOrientation: pad("orientation"),
        byAspectRatio: pad("aspectRatio"),
      },
      byGear: {
        byCameraMake: pad("cameraMake"),
        byCamera: pad("camera"),
        byLens: pad("lens"),
        byCameraLens: pad("cameraLens"),
      },
      byAuthor: pad("author"),
      byCountry: pad("country"),
      byState: pad("state"),
      byStateCountry: server.byStateCountry ?? {},
      byCity: pad("city"),
      byCityCountry: server.byCityCountry ?? {},
      byCityLocalized: server.byCityLocalized ?? {},
    },
  };
};
