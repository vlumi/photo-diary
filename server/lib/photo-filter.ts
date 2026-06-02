/* eslint-disable @typescript-eslint/no-explicit-any */

// Audit + filter predicates over loaded photo rows. The CLI (`bin/photo.ts
// audit`) and the admin photos endpoint (`GET /api/v1/photos`) both walk
// in-memory photo arrays and apply the same checks — keep the predicates
// here so the two surfaces can't drift.

export type MissingField =
  | "taken"
  | "coords"
  | "place"
  | "country"
  | "author"
  | "title"
  | "description"
  | "state-code";

// Empty-data sentinel: NULL → "" through mapRow; "Invalid date" is the
// explicit placeholder readExif emits for EXIF-less imports.
const isMissing = (v: unknown): boolean =>
  v === null ||
  v === undefined ||
  v === "" ||
  v === "unknown" ||
  v === "Invalid date";

const hasCoords = (p: any): boolean => {
  const lat = p.taken?.location?.coordinates?.latitude;
  const lon = p.taken?.location?.coordinates?.longitude;
  return !isMissing(lat) && !isMissing(lon);
};

export const MISSING_PREDICATES: Record<MissingField, (p: any) => boolean> = {
  taken: (p) => isMissing(p.taken?.instant?.timestamp),
  coords: (p) => !hasCoords(p),
  place: (p) => isMissing(p.taken?.location?.place),
  country: (p) => isMissing(p.taken?.location?.country),
  author: (p) => isMissing(p.taken?.author),
  title: (p) => isMissing(p.title),
  description: (p) => isMissing(p.description),
  "state-code": (p) =>
    hasCoords(p) && !!p.geocoded?.city && !p.geocoded?.stateCode,
};

const countryMismatch = (p: any): boolean => {
  const operator = p.taken?.location?.country;
  const geocoded = p.geocoded?.countryCode;
  if (!operator || !geocoded) return false;
  return operator.toLowerCase() !== geocoded.toLowerCase();
};

export interface PhotoFilter {
  galleryIds?: string[]; // any of these (multi-select)
  orphan?: boolean; // photos with zero gallery_photo links
  dateFrom?: string; // ISO timestamp, inclusive
  dateTo?: string; // ISO timestamp, inclusive
  missing?: MissingField[]; // intersection (all of these missing)
  duplicates?: boolean; // shares originalFilename with another row
  countryMismatch?: boolean; // operator country ≠ geocoded country
  q?: string; // free-text over title/description/originalFilename/place
}

const galleryMembershipPredicate = (
  filter: PhotoFilter,
  galleryMembers: Map<string, Set<string>>,
  orphanIds: Set<string>
): ((p: any) => boolean) | undefined => {
  const wantGalleries =
    filter.galleryIds && filter.galleryIds.length > 0
      ? new Set(filter.galleryIds)
      : undefined;
  const wantOrphan = filter.orphan === true;
  if (!wantGalleries && !wantOrphan) return undefined;
  return (p: any) => {
    if (wantOrphan && orphanIds.has(p.id)) return true;
    if (!wantGalleries) return false;
    const memberOf = galleryMembers.get(p.id);
    if (!memberOf) return false;
    for (const g of wantGalleries) if (memberOf.has(g)) return true;
    return false;
  };
};

const dateRangePredicate = (
  filter: PhotoFilter
): ((p: any) => boolean) | undefined => {
  if (!filter.dateFrom && !filter.dateTo) return undefined;
  return (p: any) => {
    const ts = p.taken?.instant?.timestamp as string | undefined;
    if (!ts) return false;
    if (filter.dateFrom && ts < filter.dateFrom) return false;
    if (filter.dateTo && ts > filter.dateTo) return false;
    return true;
  };
};

const missingPredicate = (
  filter: PhotoFilter
): ((p: any) => boolean) | undefined => {
  if (!filter.missing || filter.missing.length === 0) return undefined;
  const probes = filter.missing.map((m) => MISSING_PREDICATES[m]);
  return (p: any) => probes.every((probe) => probe(p));
};

const duplicatesPredicate = (
  photos: any[]
): ((p: any) => boolean) => {
  const counts = new Map<string, number>();
  for (const p of photos) {
    const name = p.originalFilename as string | undefined;
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return (p: any) => {
    const name = p.originalFilename as string | undefined;
    return !!name && (counts.get(name) ?? 0) > 1;
  };
};

const freeTextPredicate = (
  filter: PhotoFilter
): ((p: any) => boolean) | undefined => {
  if (!filter.q) return undefined;
  const needle = filter.q.toLowerCase();
  return (p: any) => {
    const haystacks = [
      p.title,
      p.description,
      p.originalFilename,
      p.taken?.location?.place,
      p.taken?.location?.country,
      p.geocoded?.city,
    ];
    for (const h of haystacks) {
      if (typeof h === "string" && h.toLowerCase().includes(needle)) return true;
    }
    return false;
  };
};

export interface FilterInputs {
  galleryMembers: Map<string, Set<string>>;
  orphanIds: Set<string>;
}

export const applyFilter = (
  photos: any[],
  filter: PhotoFilter,
  inputs: FilterInputs
): any[] => {
  const predicates: Array<(p: any) => boolean> = [];
  const membership = galleryMembershipPredicate(
    filter,
    inputs.galleryMembers,
    inputs.orphanIds
  );
  if (membership) predicates.push(membership);
  const dateRange = dateRangePredicate(filter);
  if (dateRange) predicates.push(dateRange);
  const missing = missingPredicate(filter);
  if (missing) predicates.push(missing);
  if (filter.duplicates) predicates.push(duplicatesPredicate(photos));
  if (filter.countryMismatch) predicates.push(countryMismatch);
  const freeText = freeTextPredicate(filter);
  if (freeText) predicates.push(freeText);

  if (predicates.length === 0) return photos.slice();
  return photos.filter((p) => predicates.every((pred) => pred(p)));
};

// Newest-first by capture timestamp. Photos without a timestamp sort to
// the end (treated as oldest), then by id for stable ordering.
export const sortByTakenDesc = (photos: any[]): any[] =>
  photos.slice().sort((a, b) => {
    const ta = a.taken?.instant?.timestamp as string | undefined;
    const tb = b.taken?.instant?.timestamp as string | undefined;
    if (ta && tb) {
      if (ta < tb) return 1;
      if (ta > tb) return -1;
    } else if (ta && !tb) {
      return -1;
    } else if (!ta && tb) {
      return 1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

export const paginate = <T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; page: number; pageSize: number; total: number } => {
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total,
  };
};
