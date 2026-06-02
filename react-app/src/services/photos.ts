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
  pageSize: number
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
  return q;
};

const list = async (
  filter: PhotoFilter,
  page: number,
  pageSize: number
): Promise<PhotosPage> =>
  unwrap(
    api.GET("/api/v1/photos", {
      params: { query: toQuery(filter, page, pageSize) },
    })
  ) as Promise<PhotosPage>;

export default { list };
