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

// `sourceGalleryId` is the gallery the saved filter is anchored to —
// the source whose photos it narrows. The saved filter's own id is a
// gallery id in its own right (unified namespace; collision-checked
// at create).

const getSavedFilters = async (
  sourceGalleryId: string
): Promise<SavedFilter[]> => {
  logger.debug("Listing saved filters", { sourceGalleryId });
  return await db.loadSavedFilters(sourceGalleryId);
};

const getSavedFilter = async (
  sourceGalleryId: string,
  id: string
): Promise<SavedFilter> => {
  logger.debug("Loading saved filter", { sourceGalleryId, id });
  return await db.loadSavedFilter(sourceGalleryId, id);
};

const createSavedFilter = async (
  sourceGalleryId: string,
  body: {
    id: string;
    title?: string;
    description?: string;
    titleLocalized?: Record<string, string>;
    descriptionLocalized?: Record<string, string>;
    definition: Record<string, unknown>;
  }
): Promise<void> => {
  assertSlugId(body.id);
  logger.debug("Creating saved filter", { sourceGalleryId, id: body.id });
  // Source gallery must exist. Surface as ValidationError rather than
  // letting the gallery_saved_filter FK throw a SQLITE_CONSTRAINT.
  try {
    await db.loadGallery(sourceGalleryId);
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw new ValidationError("Source gallery does not exist", {
        sourceGalleryId,
      });
    }
    throw err;
  }
  // The saved filter id IS a gallery id in the unified namespace —
  // reject if anything (real / hybrid / other saved-filter gallery)
  // already owns the id.
  try {
    await db.loadGallery(body.id);
    throw new ValidationError(
      "Saved filter id collides with an existing gallery id",
      { id: body.id }
    );
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
  }
  await db.createSavedFilter({
    id: body.id,
    sourceGalleryId,
    title: body.title ?? "",
    description: body.description ?? "",
    titleLocalized: body.titleLocalized ?? {},
    descriptionLocalized: body.descriptionLocalized ?? {},
    definition: body.definition,
  });
};

const updateSavedFilter = async (
  sourceGalleryId: string,
  id: string,
  patch: Partial<
    Pick<SavedFilter, "title" | "description" | "definition">
  > & {
    titleLocalized?: Record<string, string | undefined>;
    descriptionLocalized?: Record<string, string | undefined>;
  }
): Promise<void> => {
  logger.debug("Updating saved filter", { sourceGalleryId, id });
  await db.loadSavedFilter(sourceGalleryId, id);
  await db.updateSavedFilter(sourceGalleryId, id, patch);
};

const deleteSavedFilter = async (
  sourceGalleryId: string,
  id: string
): Promise<void> => {
  logger.debug("Deleting saved filter", { sourceGalleryId, id });
  await db.loadSavedFilter(sourceGalleryId, id);
  await db.deleteSavedFilter(sourceGalleryId, id);
};
