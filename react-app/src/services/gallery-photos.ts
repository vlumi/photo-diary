import api, { unwrap } from "../lib/api";

import type { ServerFilters } from "../lib/filter";
import type { DateRange, NumericRanges } from "../stores/filters";

const get = async (galleryId: string, lang?: string) =>
  unwrap(
    api.GET("/api/v1/gallery-photos/{galleryId}", {
      params: { path: { galleryId }, query: lang ? { lang } : undefined },
    })
  );

interface QueryOpts {
  filter?: ServerFilters;
  dateRange?: DateRange;
  numericRanges?: NumericRanges;
  year?: number;
  month?: number;
  day?: number;
  lang?: string;
}
// Per-view + filtered fetch (#406). Backs the view-scoped photo
// list for Month / Day; same wire shape as the unfiltered `get`.
const query = async (galleryId: string, opts: QueryOpts = {}) =>
  unwrap(
    api.POST("/api/v1/gallery-photos/{galleryId}/query", {
      params: { path: { galleryId } },
      body: opts,
    })
  );

// Per-day photo counts for the Year heatmap (#406).
const getCounts = async (
  galleryId: string,
  opts: {
    filter?: ServerFilters;
    dateRange?: DateRange;
    numericRanges?: NumericRanges;
    year?: number;
  } = {}
): Promise<Record<string, number>> =>
  unwrap(
    api.POST("/api/v1/gallery-photos/{galleryId}/counts", {
      params: { path: { galleryId } },
      body: opts,
    })
  );

// Prev / next / first / last photos within the filtered set —
// drives the Photo modal's carousel + keyboard nav (#406). `signal`
// lets TanStack's per-query AbortController cancel in-flight
// requests when the user blasts through prev/next faster than the
// network responds (#577).
const getNeighbors = async (
  galleryId: string,
  photoId: string,
  opts: {
    filter?: ServerFilters;
    dateRange?: DateRange;
    numericRanges?: NumericRanges;
    lang?: string;
  } = {},
  signal?: AbortSignal
) =>
  unwrap(
    api.POST("/api/v1/gallery-photos/{galleryId}/neighbors", {
      params: { path: { galleryId } },
      body: { photoId, ...opts },
      signal,
    })
  );

// Filter pill universe (#532). Returns categoryValues + city
// localized-label map; shares the stats cache server-side, so a
// warm cache costs nothing extra. Lets the gallery viewer skip the
// full unfiltered photo fetch it previously did just to derive
// these values client-side.
interface FilterValuesOpts {
  filter?: ServerFilters;
  dateRange?: DateRange;
  numericRanges?: NumericRanges;
  lang?: string;
}
const getFilterValues = async (
  galleryId: string,
  opts: FilterValuesOpts = {}
) =>
  unwrap(
    api.POST("/api/v1/gallery-photos/{galleryId}/filter-values", {
      params: { path: { galleryId } },
      body: opts,
    })
  );

// One photo by id within a gallery context. Drives the Photo modal
// mount under #532 phase 2 — replaces the in-memory `gallery.photo
// (...)` lookup that needed the gallery's full photo array.
const getOne = async (
  galleryId: string,
  photoId: string,
  lang?: string,
  signal?: AbortSignal
) =>
  unwrap(
    api.GET("/api/v1/gallery-photos/{galleryId}/{photoId}", {
      params: {
        path: { galleryId, photoId },
        query: lang ? { lang } : undefined,
      },
      signal,
    })
  );

// Pre-rename / camera-filename bookmark fallback. When a Photo URL's
// id doesn't resolve to a real photo via the per-id endpoint, the
// modal mount tries this lookup against the original camera filename
// before redirecting to the month view.
const getByOriginalFilename = async (
  galleryId: string,
  originalFilename: string,
  lang?: string
) =>
  unwrap(
    api.GET(
      "/api/v1/gallery-photos/{galleryId}/by-original-filename/{originalFilename}",
      {
        params: {
          path: { galleryId, originalFilename },
          query: lang ? { lang } : undefined,
        },
      }
    )
  );

const link = async (galleryId: string, photoId: string): Promise<void> => {
  await unwrap(
    api.PUT("/api/v1/gallery-photos/{galleryId}/{photoId}", {
      params: { path: { galleryId, photoId } },
    })
  );
};

const unlink = async (galleryId: string, photoId: string): Promise<void> => {
  await unwrap(
    api.DELETE("/api/v1/gallery-photos/{galleryId}/{photoId}", {
      params: { path: { galleryId, photoId } },
    })
  );
};

export default {
  get,
  query,
  getCounts,
  getNeighbors,
  getFilterValues,
  getOne,
  getByOriginalFilename,
  link,
  unlink,
};
