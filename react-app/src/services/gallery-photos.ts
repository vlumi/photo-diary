import api, { unwrap } from "../lib/api";

import type { ServerFilters } from "../lib/filter";

const get = async (galleryId: string, lang?: string) =>
  unwrap(
    api.GET("/api/v1/gallery-photos/{galleryId}", {
      params: { path: { galleryId }, query: lang ? { lang } : undefined },
    })
  );

interface QueryOpts {
  filter?: ServerFilters;
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
  opts: { filter?: ServerFilters; year?: number } = {}
): Promise<Record<string, number>> =>
  unwrap(
    api.POST("/api/v1/gallery-photos/{galleryId}/counts", {
      params: { path: { galleryId } },
      body: opts,
    })
  );

// Prev / next / first / last photos within the filtered set —
// drives the Photo modal's carousel + keyboard nav (#406).
const getNeighbors = async (
  galleryId: string,
  photoId: string,
  opts: { filter?: ServerFilters; lang?: string } = {}
) =>
  unwrap(
    api.POST("/api/v1/gallery-photos/{galleryId}/neighbors", {
      params: { path: { galleryId } },
      body: { photoId, ...opts },
    })
  );

// Filter pill universe (#532). Returns categoryValues + city
// localized-label map; shares the stats cache server-side, so a
// warm cache costs nothing extra. Lets the gallery viewer skip the
// full unfiltered photo fetch it previously did just to derive
// these values client-side.
const getFilterValues = async (galleryId: string, lang?: string) =>
  unwrap(
    api.GET("/api/v1/gallery-photos/{galleryId}/filter-values", {
      params: { path: { galleryId }, query: lang ? { lang } : undefined },
    })
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
  link,
  unlink,
};
