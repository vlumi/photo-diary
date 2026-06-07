import api, { unwrap } from "../lib/api";

export type MissingField =
  | "taken"
  | "coords"
  | "place"
  | "country"
  | "author"
  | "title"
  | "description"
  | "state-code";

export interface PhotoFilter {
  galleryIds?: string[];
  orphan?: boolean;
  dateFrom?: string;
  dateTo?: string;
  missing?: MissingField[];
  duplicates?: boolean;
  countryMismatch?: boolean;
  q?: string;
}

export interface PhotosPage {
  photos: Array<Record<string, unknown> & { id: string }>;
  page: number;
  pageSize: number;
  total: number;
}

const toQuery = (
  filter: PhotoFilter,
  page: number,
  pageSize: number,
  photoIdFocus?: string
): Record<string, unknown> => {
  const q: Record<string, unknown> = {};
  if (filter.galleryIds && filter.galleryIds.length > 0)
    q.gallery = filter.galleryIds;
  if (filter.orphan) q.orphan = true;
  if (filter.dateFrom) q.dateFrom = filter.dateFrom;
  if (filter.dateTo) q.dateTo = filter.dateTo;
  if (filter.missing && filter.missing.length > 0) q.missing = filter.missing;
  if (filter.duplicates) q.duplicates = true;
  if (filter.countryMismatch) q.countryMismatch = true;
  if (filter.q) q.q = filter.q;
  if (page > 1) q.page = page;
  if (pageSize !== 100) q.pageSize = pageSize;
  if (photoIdFocus) q.photoIdFocus = photoIdFocus;
  return q;
};

const list = async (
  filter: PhotoFilter,
  page: number,
  pageSize: number,
  photoIdFocus?: string
): Promise<PhotosPage> =>
  unwrap(
    api.GET("/api/v1/photos", {
      params: { query: toQuery(filter, page, pageSize, photoIdFocus) },
    })
  ) as Promise<PhotosPage>;

// Wide-open photo type from the server — same shape the public
// /gallery-photos uses. Operator-set fields are nested under
// `taken.location`, `taken.author`, `camera`, `lens`, `exposure`.
export type PhotoRow = Record<string, unknown> & { id: string };

const get = async (id: string): Promise<PhotoRow> =>
  unwrap(
    api.GET("/api/v1/photos/{photoId}", {
      params: { path: { photoId: id } },
    })
  ) as Promise<PhotoRow>;

const getByIds = async (ids: string[]): Promise<PhotoRow[]> => {
  if (ids.length === 0) return [];
  const result = (await unwrap(
    api.POST("/api/v1/photos/by-ids", { body: { ids } })
  )) as { photos: PhotoRow[] };
  return result.photos;
};

// PhotoUpdateBody on the server only accepts the override fields
// `bin/photo.ts update` exposes. EXIF-derived columns reject with 400.
export interface PhotoUpdatePatch {
  title?: string;
  description?: string;
  taken?: {
    author?: string;
    location?: {
      country?: string;
      place?: string;
      coordinates?: {
        latitude?: number | null;
        longitude?: number | null;
        altitude?: number | null;
      };
    };
  };
  camera?: {
    make?: string;
    model?: string;
  };
  lens?: {
    make?: string;
    model?: string;
  };
  exposure?: {
    focalLength?: number;
    focalLength35mmEquiv?: number;
    aperture?: number;
  };
}

const update = async (id: string, patch: PhotoUpdatePatch): Promise<void> => {
  await unwrap(
    api.PUT("/api/v1/photos/{photoId}", {
      params: { path: { photoId: id } },
      body: patch,
    })
  );
};

// Clear the photo's geocoded_* columns and drop a sidecar so the
// converter daemon re-fetches via Nominatim. No body / no coord
// change; same semantic as the coord-edit path's clear step on
// `PUT`, but for the "refresh as-is" case.
const regeocode = async (id: string): Promise<void> => {
  await unwrap(
    api.POST("/api/v1/photos/{photoId}/regeocode", {
      params: { path: { photoId: id } },
    })
  );
};

const remove = async (id: string): Promise<void> => {
  await unwrap(
    api.DELETE("/api/v1/photos/{photoId}", {
      params: { path: { photoId: id } },
    })
  );
};

export default { list, get, getByIds, update, regeocode, remove };
