import { NotFoundError } from "../../lib/errors.js";
import {
  type Gallery,
  type GalleryInput,
  type GalleryLocalizedRow,
  type GalleryRow,
} from "./schema.js";
import { SCHEMA, db, deleteById } from "./connection.js";
import { loadGalleryLocalizedFor } from "./photos.js";
import {
  decorateGalleryWithSavedFilter,
  decorateGalleryWithSources,
  loadAllGallerySavedFilters,
  loadAllVirtualGalleries,
  loadGallerySavedFilterRow,
  loadVirtualGallerySources,
} from "./virtual-galleries.js";

export const loadGalleries = async () => {
  const rows = db
    .prepare(SCHEMA.gallery.buildSelectQuery())
    .all() as GalleryRow[];
  const sourcesByGallery = loadAllVirtualGalleries();
  const savedFiltersByGallery = loadAllGallerySavedFilters();
  const localizedByGallery = loadGalleryLocalizedFor(rows.map((r) => r.id));
  return rows
    .map((row) => SCHEMA.gallery.mapRow(row, localizedByGallery.get(row.id)))
    .map((g) => decorateGalleryWithSources(g, sourcesByGallery))
    .map((g) => decorateGalleryWithSavedFilter(g, savedFiltersByGallery));
};
export const createGallery = async (gallery: Gallery) => {
  db.prepare(SCHEMA.gallery.buildCreateQuery()).run(
    SCHEMA.gallery.mapInsert(gallery)
  );
  // Localized overlay rows from the same payload — symmetrical with
  // updateGallery. CLI / API creates without overlay maps stay no-op.
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
  merge(gallery.titleLocalized, "title");
  merge(gallery.descriptionLocalized, "description");
  for (const [lang, fields] of perLang) {
    upsertGalleryLocalizedFields(gallery.id, lang, fields);
  }
};
export const loadGallery = async (galleryId: string) => {
  const row = db
    .prepare(SCHEMA.gallery.buildSelectByIdQuery())
    .get(galleryId) as GalleryRow | undefined;
  if (!row) throw new NotFoundError();
  const localizedRows = db
    .prepare("SELECT * FROM gallery_localized WHERE gallery_id = ?")
    .all(galleryId) as GalleryLocalizedRow[];
  let gallery = SCHEMA.gallery.mapRow(row, localizedRows);
  if (gallery.type === "hybrid") {
    const sources = loadVirtualGallerySources(galleryId);
    if (sources !== undefined) gallery = { ...gallery, sources };
  } else if (gallery.type === "saved_filter") {
    const sfRow = loadGallerySavedFilterRow(galleryId);
    if (sfRow) {
      let definition: Record<string, unknown> = {};
      try {
        definition = JSON.parse(sfRow.definition) as Record<string, unknown>;
      } catch {
        // Stale / malformed JSON — fall through to empty definition.
      }
      gallery = {
        ...gallery,
        savedFilter: {
          sourceGalleryId: sfRow.source_gallery_id,
          definition,
        },
      };
    }
  }
  return gallery;
};
export const updateGallery = async (galleryId: string, gallery: GalleryInput) => {
  const { query, values } = SCHEMA.gallery.buildUpdateByIdQuery(gallery);
  if (query && values) {
    db.prepare(query).run([...values, galleryId]);
  }
  // Per-language overlays for title / description. Same semantics
  // as the photo path: empty string clears, missing lang leaves the
  // existing column.
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
  merge(gallery.titleLocalized, "title");
  merge(gallery.descriptionLocalized, "description");
  for (const [lang, fields] of perLang) {
    upsertGalleryLocalizedFields(galleryId, lang, fields);
  }
};
export const upsertGalleryLocalizedFields = (
  galleryId: string,
  lang: string,
  fields: { title?: string | null; description?: string | null }
): void => {
  const cols: string[] = [];
  const vals: unknown[] = [];
  if (fields.title !== undefined) {
    cols.push("title");
    vals.push(fields.title);
  }
  if (fields.description !== undefined) {
    cols.push("description");
    vals.push(fields.description);
  }
  if (cols.length === 0) return;
  const colList = cols.join(", ");
  const placeholders = cols.map(() => "?").join(", ");
  const updates = cols.map((c) => `${c} = excluded.${c}`).join(", ");
  db.prepare(
    `INSERT INTO gallery_localized (gallery_id, lang, ${colList})
     VALUES (?, ?, ${placeholders})
     ON CONFLICT (gallery_id, lang) DO UPDATE SET ${updates}`
  ).run(galleryId, lang, ...vals);
};
export const deleteGallery = async (galleryId: string) =>
  deleteById(SCHEMA.gallery, galleryId);

// Apply an operator-curated gallery order. Caller has
// already validated that `ids` covers exactly the gallery id set,
// so this just stamps each row's ordinal by position. Single
// transaction so a half-applied reorder can't leak.
export const setGalleryOrder = async (ids: string[]): Promise<void> => {
  const stmt = db.prepare("UPDATE gallery SET ordinal = ? WHERE id = ?");
  const tx = db.transaction((list: string[]) => {
    list.forEach((id, idx) => {
      stmt.run(idx, id);
    });
  });
  tx(ids);
};
