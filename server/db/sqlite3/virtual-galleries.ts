import { NotFoundError } from "../../lib/errors.js";
import {
  matchesDateRange,
  matchesFilter,
  matchesNumericRanges,
  type DateRange,
  type FilterShape,
  type NumericRanges,
} from "../../lib/photo-filter-eval.js";
import {
  buildLocalizedMap,
  type Gallery,
  type GalleryInput,
  type GalleryLocalizedRow,
  type GalleryRow,
  type Photo,
  type GallerySavedFilterRow,
  type SavedFilter,
  type VirtualGallerySourceRow,
} from "./schema.js";
import { SCHEMA, db } from "./connection.js";
import { upsertGalleryLocalizedFields } from "./galleries.js";
import { loadGalleryLocalizedFor } from "./photos.js";

// Resolves a gallery id to the pieces the read path needs:
//
//   - `sources`: list of real-gallery ids whose `gallery_photo`
//     rows make up the gallery's contents. Real gallery → [self];
//     hybrid → its stored sources (virtual_gallery_source); saved
//     filter → [source_gallery_id] from gallery_saved_filter.
//
//   - `baseline`: filter + dateRange stored on a saved-filter
//     gallery. Applied on top of the source's photos so the gallery
//     reads as a narrowed view. Undefined for real and hybrid.
//
// Every read path (load photos / counts / neighbors / filter values)
// goes through this resolver — type dispatch lives here, downstream
// callers stay uniform.
export interface BaselineShape {
  filter?: FilterShape;
  dateRange?: DateRange;
  numericRanges?: NumericRanges;
}
export interface GalleryRef {
  sources: string[];
  baseline?: BaselineShape;
}
export const resolveGalleryRef = (galleryId: string): GalleryRef => {
  const savedFilter = loadGallerySavedFilterRow(galleryId);
  if (savedFilter) {
    let baseline: BaselineShape = {};
    try {
      baseline = JSON.parse(savedFilter.definition) as BaselineShape;
    } catch {
      // Malformed JSON shouldn't happen (writes go through
      // JSON.stringify) but if it does, treat as empty baseline.
    }
    return {
      sources: [savedFilter.source_gallery_id],
      baseline: {
        filter: baseline.filter,
        dateRange: baseline.dateRange,
        numericRanges: baseline.numericRanges,
      },
    };
  }
  const virtual = loadVirtualGallerySources(galleryId);
  if (virtual !== undefined) return { sources: virtual };
  return { sources: [galleryId] };
};
// Drop photos that fail the saved-filter gallery's baseline. No-op
// when called against a real or hybrid gallery (`ref.baseline`
// absent).
export const applyBaseline = (photos: Photo[], ref: GalleryRef): Photo[] => {
  if (!ref.baseline) return photos;
  const { filter, dateRange, numericRanges } = ref.baseline;
  return photos.filter(
    (p) =>
      matchesDateRange(dateRange, p) &&
      matchesNumericRanges(numericRanges, p) &&
      matchesFilter(filter, p)
  );
};
// Single-photo baseline check. NotFoundError-style: returns true if
// the photo is part of the saved filter's effective set.
export const photoPassesBaseline = (photo: Photo, ref: GalleryRef): boolean => {
  if (!ref.baseline) return true;
  return (
    matchesDateRange(ref.baseline.dateRange, photo) &&
    matchesNumericRanges(ref.baseline.numericRanges, photo) &&
    matchesFilter(ref.baseline.filter, photo)
  );
};

export const loadGallerySavedFilterRow = (
  galleryId: string
): GallerySavedFilterRow | undefined => {
  return db
    .prepare(
      "SELECT gallery_id, source_gallery_id, definition FROM gallery_saved_filter WHERE gallery_id = ?"
    )
    .get(galleryId) as GallerySavedFilterRow | undefined;
};
export const loadAllGallerySavedFilters = (): Map<string, GallerySavedFilterRow> => {
  const rows = db
    .prepare(
      "SELECT gallery_id, source_gallery_id, definition FROM gallery_saved_filter"
    )
    .all() as GallerySavedFilterRow[];
  const out = new Map<string, GallerySavedFilterRow>();
  for (const r of rows) out.set(r.gallery_id, r);
  return out;
};

// Virtual galleries: sibling `virtual_gallery_source` junction
// table holds one row per (virtual, source) pair, ordered by
// `ordinal` to preserve the operator's input order. A
// gallery is virtual iff it has at least one row here. Loaders
// below decorate the base Gallery row with `sources` when present.
export const loadAllVirtualGalleries = (): Map<string, string[]> => {
  const rows = db
    .prepare(
      "SELECT gallery_id, source_id, ordinal FROM virtual_gallery_source ORDER BY gallery_id, ordinal"
    )
    .all() as VirtualGallerySourceRow[];
  const out = new Map<string, string[]>();
  for (const row of rows) {
    const list = out.get(row.gallery_id);
    if (list) {
      list.push(row.source_id);
    } else {
      out.set(row.gallery_id, [row.source_id]);
    }
  }
  return out;
};
export const loadVirtualGallerySources = (galleryId: string): string[] | undefined => {
  const rows = db
    .prepare(
      "SELECT source_id FROM virtual_gallery_source WHERE gallery_id = ? ORDER BY ordinal"
    )
    .all(galleryId) as Pick<VirtualGallerySourceRow, "source_id">[];
  if (rows.length === 0) return undefined;
  return rows.map((r) => r.source_id);
};
export const isVirtualGallery = async (galleryId: string): Promise<boolean> => {
  const row = db
    .prepare(
      "SELECT 1 FROM virtual_gallery_source WHERE gallery_id = ? LIMIT 1"
    )
    .get(galleryId);
  return row !== undefined;
};
// True iff some virtual gallery references this id as a source.
// Used to block "convert a real gallery to virtual" when it's
// already in another virtual's source list, preserving the
// "virtuals source only real galleries" invariant (no chained
// virtuals).
export const isReferencedAsSource = async (galleryId: string): Promise<boolean> => {
  const row = db
    .prepare(
      "SELECT 1 FROM virtual_gallery_source WHERE source_id = ? LIMIT 1"
    )
    .get(galleryId);
  return row !== undefined;
};
export const decorateGalleryWithSources = (
  gallery: Gallery,
  sourcesByGallery: Map<string, string[]>
): Gallery => {
  const sources = sourcesByGallery.get(gallery.id);
  return sources === undefined ? gallery : { ...gallery, sources };
};
export const decorateGalleryWithSavedFilter = (
  gallery: Gallery,
  byGallery: Map<string, GallerySavedFilterRow>
): Gallery => {
  if (gallery.type !== "saved_filter") return gallery;
  const row = byGallery.get(gallery.id);
  if (!row) return gallery;
  let definition: Record<string, unknown> = {};
  try {
    definition = JSON.parse(row.definition) as Record<string, unknown>;
  } catch {
    // Stale / malformed JSON — fall through to empty definition.
  }
  return {
    ...gallery,
    savedFilter: {
      sourceGalleryId: row.source_gallery_id,
      definition,
    },
  };
};
// Replace the source set atomically — DELETE existing rows then
// INSERT each in input order. better-sqlite3's `transaction(fn)`
// wraps the body in BEGIN/COMMIT.
export const upsertVirtualGallery = async (
  galleryId: string,
  sources: string[]
): Promise<void> => {
  const del = db.prepare(
    "DELETE FROM virtual_gallery_source WHERE gallery_id = ?"
  );
  const ins = db.prepare(
    "INSERT INTO virtual_gallery_source (gallery_id, source_id, ordinal) VALUES (?, ?, ?)"
  );
  const stampType = db.prepare(
    "UPDATE gallery SET type = 'hybrid' WHERE id = ?"
  );
  const replace = db.transaction((gid: string, list: string[]) => {
    del.run(gid);
    list.forEach((sourceId, i) => {
      ins.run(gid, sourceId, i);
    });
    stampType.run(gid);
  });
  replace(galleryId, sources);
};
export const deleteVirtualGallery = async (galleryId: string): Promise<void> => {
  // Drop the sources and revert the gallery to a plain real gallery so
  // `type` stays in sync with side-table presence.
  const tx = db.transaction((gid: string) => {
    db.prepare(
      "DELETE FROM virtual_gallery_source WHERE gallery_id = ?"
    ).run(gid);
    db.prepare("UPDATE gallery SET type = 'real' WHERE id = ?").run(gid);
  });
  tx(galleryId);
};

// Saved filters live as galleries of `type='saved_filter'`.
// The saved-filter id IS the gallery id. Title / description /
// localized maps come from the gallery row + gallery_localized;
// source + definition come from the side table gallery_saved_filter.
// CRUD here writes both atomically; the model layer enforces the
// id-uniqueness invariants (no collision with other gallery ids,
// source gallery exists, slug shape).
export const mapSavedFilterGalleryRow = (
  galleryRow: GalleryRow,
  sfRow: GallerySavedFilterRow,
  localized?: GalleryLocalizedRow[]
): SavedFilter => {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(sfRow.definition) as Record<string, unknown>;
  } catch {
    // Malformed JSON shouldn't be reachable through the write path
    // (createSavedFilter always JSON.stringify's), but guard against
    // a stale row from outside.
  }
  return {
    id: galleryRow.id,
    sourceGalleryId: sfRow.source_gallery_id,
    title: galleryRow.title,
    description: galleryRow.description,
    titleLocalized: buildLocalizedMap(localized, "title"),
    descriptionLocalized: buildLocalizedMap(localized, "description"),
    definition: parsed,
  };
};
export const loadSavedFilters = async (sourceGalleryId: string): Promise<SavedFilter[]> => {
  // Fetch saved-filter galleries pointing at this source. Sort by
  // gallery id ASC, matching the gallery list's natural order.
  const rows = db
    .prepare(
      `SELECT g.id, g.title, g.description, g.icon, g.icon_source, g.epoch,
              g.epoch_type, g.theme, g.initial_view, g.hostname,
              g.default_language, g.type,
              sf.gallery_id, sf.source_gallery_id, sf.definition
       FROM gallery_saved_filter sf
       JOIN gallery g ON g.id = sf.gallery_id
       WHERE sf.source_gallery_id = ? AND g.type = 'saved_filter'
       ORDER BY g.id ASC`
    )
    .all(sourceGalleryId) as Array<GalleryRow & GallerySavedFilterRow>;
  const localized = loadGalleryLocalizedFor(rows.map((r) => r.id));
  return rows.map((row) =>
    mapSavedFilterGalleryRow(
      row,
      {
        gallery_id: row.gallery_id,
        source_gallery_id: row.source_gallery_id,
        definition: row.definition,
      },
      localized.get(row.id)
    )
  );
};
export const loadSavedFilter = async (
  sourceGalleryId: string,
  id: string
): Promise<SavedFilter> => {
  const galleryRow = db
    .prepare(SCHEMA.gallery.buildSelectByIdQuery())
    .get(id) as GalleryRow | undefined;
  if (!galleryRow || galleryRow.type !== "saved_filter") {
    throw new NotFoundError();
  }
  const sfRow = loadGallerySavedFilterRow(id);
  if (!sfRow || sfRow.source_gallery_id !== sourceGalleryId) {
    throw new NotFoundError();
  }
  const localized = db
    .prepare("SELECT * FROM gallery_localized WHERE gallery_id = ?")
    .all(id) as GalleryLocalizedRow[];
  return mapSavedFilterGalleryRow(galleryRow, sfRow, localized);
};
// Write the gallery row (type='saved_filter') + the gallery_saved_filter
// side row + any localized overlays in one transaction so a halfway
// state can't leak. Source gallery existence and id-collision checks
// belong to the model layer.
export const createSavedFilter = async (filter: SavedFilter): Promise<void> => {
  // Inherit the default_language from the source so the canonical
  // title / description sit in the same language. Other gallery-shape
  // columns get safe defaults — saved-filter pseudo-galleries don't
  // carry their own icon / theme / epoch (icon is a follow-up).
  const sourceRow = db
    .prepare(SCHEMA.gallery.buildSelectByIdQuery())
    .get(filter.sourceGalleryId) as GalleryRow | undefined;
  if (!sourceRow) {
    throw new NotFoundError();
  }
  const insert = db.transaction(() => {
    db.prepare(SCHEMA.gallery.buildCreateQuery()).run(
      SCHEMA.gallery.mapInsert({
        id: filter.id,
        title: filter.title,
        description: filter.description,
        icon: "",
        iconSource: null,
        epoch: "",
        epochType: "",
        theme: "",
        initialView: "",
        hostname: "",
        defaultLanguage: sourceRow.default_language || "en",
        type: "saved_filter",
        ordinal: 0,
      })
    );
    db.prepare(
      "INSERT INTO gallery_saved_filter (gallery_id, source_gallery_id, definition) VALUES (?, ?, ?)"
    ).run(filter.id, filter.sourceGalleryId, JSON.stringify(filter.definition ?? {}));
  });
  insert();
  // Localized overlays go to gallery_localized via the gallery path
  // (reused, since saved filter IS a gallery now).
  const perLang = new Map<string, { title?: string | null; description?: string | null }>();
  const merge = (
    map: Record<string, string | undefined> | undefined,
    field: "title" | "description"
  ) => {
    if (!map) return;
    for (const [lang, value] of Object.entries(map)) {
      if (value === undefined) continue;
      const entry = perLang.get(lang) ?? {};
      entry[field] = value === "" ? null : value;
      perLang.set(lang, entry);
    }
  };
  merge(filter.titleLocalized, "title");
  merge(filter.descriptionLocalized, "description");
  for (const [lang, fields] of perLang) {
    upsertGalleryLocalizedFields(filter.id, lang, fields);
  }
};
export const updateSavedFilter = async (
  sourceGalleryId: string,
  id: string,
  patch: Partial<
    Pick<SavedFilter, "title" | "description" | "definition">
  > & {
    titleLocalized?: Record<string, string | undefined>;
    descriptionLocalized?: Record<string, string | undefined>;
  }
): Promise<void> => {
  // Verify the row exists + belongs to this source; matches the
  // loadSavedFilter check so updates can't drift across sources.
  await loadSavedFilter(sourceGalleryId, id);
  // Canonical title / description are gallery columns.
  if (patch.title !== undefined || patch.description !== undefined) {
    const galleryPatch: GalleryInput = {};
    if (patch.title !== undefined) galleryPatch.title = patch.title;
    if (patch.description !== undefined)
      galleryPatch.description = patch.description;
    const { query, values } = SCHEMA.gallery.buildUpdateByIdQuery(galleryPatch);
    if (query && values) {
      db.prepare(query).run([...values, id]);
    }
  }
  if (patch.definition !== undefined) {
    db.prepare(
      "UPDATE gallery_saved_filter SET definition = ? WHERE gallery_id = ?"
    ).run(JSON.stringify(patch.definition), id);
  }
  // Localized overlays via the gallery path.
  const perLang = new Map<string, { title?: string | null; description?: string | null }>();
  const merge = (
    map: Record<string, string | undefined> | undefined,
    field: "title" | "description"
  ) => {
    if (!map) return;
    for (const [lang, value] of Object.entries(map)) {
      if (value === undefined) continue;
      const entry = perLang.get(lang) ?? {};
      entry[field] = value === "" ? null : value;
      perLang.set(lang, entry);
    }
  };
  merge(patch.titleLocalized, "title");
  merge(patch.descriptionLocalized, "description");
  for (const [lang, fields] of perLang) {
    upsertGalleryLocalizedFields(id, lang, fields);
  }
};
export const deleteSavedFilter = async (
  sourceGalleryId: string,
  id: string
): Promise<void> => {
  // ON DELETE CASCADE on gallery_saved_filter + gallery_localized
  // tears down the side rows when the gallery goes.
  await loadSavedFilter(sourceGalleryId, id);
  db.prepare("DELETE FROM gallery WHERE id = ?").run(id);
};
