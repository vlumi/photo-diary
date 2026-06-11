import logger from "../lib/logger.js";
import db from "../db/index.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import { assertSlugId } from "../lib/id-shape.js";

import type { SavedFilter } from "../db/sqlite3/schema.js";

export default () => ({
  init,
  getSavedFilters,
  getSavedFilter,
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter,
});

const init = async () => {};

const getSavedFilters = async (galleryId: string): Promise<SavedFilter[]> => {
  logger.debug("Listing saved filters", { galleryId });
  // FK ON DELETE CASCADE means rows only exist for existing galleries
  // — but the gallery may still be a virtual gallery whose `sources`
  // resolve at /query time; we don't try to constrain that here.
  return await db.loadSavedFilters(galleryId);
};

const getSavedFilter = async (
  galleryId: string,
  id: string
): Promise<SavedFilter> => {
  logger.debug("Loading saved filter", { galleryId, id });
  return await db.loadSavedFilter(galleryId, id);
};

const createSavedFilter = async (
  galleryId: string,
  body: {
    id: string;
    title?: string;
    description?: string;
    titleLocalized?: Record<string, string>;
    descriptionLocalized?: Record<string, string>;
    definition: Record<string, unknown>;
    ordinal?: number;
  }
): Promise<void> => {
  assertSlugId(body.id);
  logger.debug("Creating saved filter", { galleryId, id: body.id });
  // The gallery must exist — FK would reject otherwise, but surface
  // a cleaner error than a SQLITE_CONSTRAINT for the API consumer.
  try {
    await db.loadGallery(galleryId);
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw new ValidationError("Source gallery does not exist", {
        galleryId,
      });
    }
    throw err;
  }
  // Reject duplicate id within the same gallery up-front for the
  // same friendlier-error reason. Cross-gallery collisions are fine
  // (id is (gallery_id, id) primary key).
  try {
    await db.loadSavedFilter(galleryId, body.id);
    throw new ValidationError(
      "Saved filter with this id already exists in this gallery",
      { galleryId, id: body.id }
    );
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
  }
  await db.createSavedFilter({
    id: body.id,
    galleryId,
    title: body.title ?? "",
    description: body.description ?? "",
    titleLocalized: body.titleLocalized ?? {},
    descriptionLocalized: body.descriptionLocalized ?? {},
    definition: body.definition,
    ordinal: body.ordinal ?? 0,
  });
};

const updateSavedFilter = async (
  galleryId: string,
  id: string,
  patch: Partial<
    Pick<SavedFilter, "title" | "description" | "definition" | "ordinal">
  > & {
    titleLocalized?: Record<string, string | undefined>;
    descriptionLocalized?: Record<string, string | undefined>;
  }
): Promise<void> => {
  logger.debug("Updating saved filter", { galleryId, id });
  await db.loadSavedFilter(galleryId, id);
  await db.updateSavedFilter(galleryId, id, patch);
};

const deleteSavedFilter = async (
  galleryId: string,
  id: string
): Promise<void> => {
  logger.debug("Deleting saved filter", { galleryId, id });
  await db.loadSavedFilter(galleryId, id);
  await db.deleteSavedFilter(galleryId, id);
};
