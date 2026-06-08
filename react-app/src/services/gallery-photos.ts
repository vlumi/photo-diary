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

export default { get, query, getCounts, link, unlink };
