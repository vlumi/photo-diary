import api, { unwrap } from "../lib/api";
import type { paths } from "../lib/api-schema";

import type { ServerFilters } from "../lib/filter";
import type { DateRange, NumericRanges } from "../stores/filters";

export type GalleryStats =
  paths["/api/v1/galleries/{galleryId}/stats"]["post"]["responses"]["200"]["content"]["application/json"];

const getGalleryStats = async (
  galleryId: string,
  filter: ServerFilters,
  lang?: string,
  dateRange?: DateRange,
  numericRanges?: NumericRanges
): Promise<GalleryStats> =>
  unwrap(
    api.POST("/api/v1/galleries/{galleryId}/stats", {
      params: { path: { galleryId } },
      body: { filter, dateRange, numericRanges, lang },
    })
  );

// Cross-gallery (admin-only) stats. Same response shape as the
// gallery-scoped endpoint, so the client-side adapter +
// collectTopics work unchanged regardless of scope.
const getGlobalStats = async (
  filter: ServerFilters,
  lang?: string,
  dateRange?: DateRange,
  numericRanges?: NumericRanges
): Promise<GalleryStats> =>
  unwrap(
    api.POST("/api/v1/stats", {
      body: { filter, dateRange, numericRanges, lang },
    })
  );

// Cross-gallery filter pill universe (admin-only). Drives the
// GlobalStats filter sidebar without needing the full photo array
// client-side.
const getGlobalFilterValues = async (
  filter?: ServerFilters,
  lang?: string,
  dateRange?: DateRange,
  numericRanges?: NumericRanges
) =>
  unwrap(
    api.POST("/api/v1/filter-values", {
      body: { filter, dateRange, numericRanges, lang },
    })
  );

// Per-bucket time-series for the trend chart in the category
// modal. Lazy — fired when the user opens a trendable category.
const getGalleryEvolution = async (
  galleryId: string,
  category: string,
  filter: ServerFilters,
  lang?: string,
  dateRange?: DateRange,
  numericRanges?: NumericRanges
) =>
  unwrap(
    api.POST("/api/v1/galleries/{galleryId}/stats/evolution", {
      params: { path: { galleryId } },
      body: { category, filter, dateRange, numericRanges, lang },
    })
  );

export default {
  getGalleryStats,
  getGlobalStats,
  getGlobalFilterValues,
  getGalleryEvolution,
};
