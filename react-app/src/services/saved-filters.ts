import api, { unwrap } from "../lib/api";

import type { ServerFilters } from "../lib/filter";
import type { DateRange, NumericRanges } from "../stores/filters";

// Wire shape the server's `definition` JSON envelope carries —
// FilterShape + optional dateRange + optional numericRanges,
// matching the per-view endpoints (`/query`, `/counts`,
// `/neighbors`) the saved filter applies to.
export interface SavedFilterDefinition {
  filter?: ServerFilters;
  dateRange?: DateRange;
  numericRanges?: NumericRanges;
  [key: string]: unknown;
}
export interface SavedFilter {
  id: string;
  sourceGalleryId: string;
  title: string;
  description: string;
  titleLocalized: Record<string, string>;
  descriptionLocalized: Record<string, string>;
  definition: SavedFilterDefinition;
}

const list = async (galleryId: string): Promise<SavedFilter[]> =>
  unwrap(
    api.GET("/api/v1/galleries/{galleryId}/filters", {
      params: { path: { galleryId } },
    })
  ) as Promise<SavedFilter[]>;

const get = async (galleryId: string, filterId: string) =>
  unwrap(
    api.GET("/api/v1/galleries/{galleryId}/filters/{filterId}", {
      params: { path: { galleryId, filterId } },
    })
  ) as Promise<SavedFilter>;

export interface SavedFilterCreateBody {
  id: string;
  title?: string;
  description?: string;
  titleLocalized?: Record<string, string>;
  descriptionLocalized?: Record<string, string>;
  definition: SavedFilterDefinition;
}
const create = async (
  galleryId: string,
  body: SavedFilterCreateBody
): Promise<void> => {
  await unwrap(
    api.POST("/api/v1/galleries/{galleryId}/filters", {
      params: { path: { galleryId } },
      body,
    })
  );
};

export interface SavedFilterUpdatePatch {
  title?: string;
  description?: string;
  titleLocalized?: Record<string, string>;
  descriptionLocalized?: Record<string, string>;
  definition?: SavedFilterDefinition;
}
const update = async (
  galleryId: string,
  filterId: string,
  patch: SavedFilterUpdatePatch
): Promise<void> => {
  await unwrap(
    api.PUT("/api/v1/galleries/{galleryId}/filters/{filterId}", {
      params: { path: { galleryId, filterId } },
      body: patch,
    })
  );
};

const remove = async (galleryId: string, filterId: string): Promise<void> => {
  await unwrap(
    api.DELETE("/api/v1/galleries/{galleryId}/filters/{filterId}", {
      params: { path: { galleryId, filterId } },
    })
  );
};

export default { list, get, create, update, remove };
