import { AccessError } from "./errors.js";
import db from "../db/index.js";

export default () => {
  return {
    authorizeView,
    authorizeAdmin,
    authorizeGalleryView,
    authorizeGalleryEditor,
    authorizePhotoEditor,
    loadEditorGalleries,
  };
};

// Driver-agnostic resolution. Any underlying failure surfaces as a
// uniform AccessError so the controllers don't have to distinguish
// "user not found" from "permission denied."
const resolve = async (
  userId: string,
  galleryId: string
): Promise<{ hasAccess: boolean; isEditor: boolean }> => {
  try {
    return await db.resolveAccessLevel(userId, galleryId);
  } catch {
    return { hasAccess: false, isEditor: false };
  }
};

const isGlobalAdmin = async (userId: string): Promise<boolean> => {
  try {
    const user = (await db.loadUser(userId)) as { is_admin?: number | boolean };
    return !!user.is_admin;
  } catch {
    return false;
  }
};

// Global-admin-only operations (user CRUD, gallery CRUD, instance meta).
const authorizeAdmin = async (userId: string): Promise<void> => {
  if (!(await isGlobalAdmin(userId))) {
    throw new AccessError(undefined, { userId, required: "global admin" });
  }
};

// Equivalent to "is global admin" under the new model — there's no
// "global view" tier. Kept as a separate verb because the existing
// cross-gallery endpoints (`GET /photos`, `GET /photos/:id`) used it
// to mean "user has visibility across the catalogue," and that role
// is now strictly admin.
const authorizeView = authorizeAdmin;

// Saved-filter pseudo-galleries (#285) inherit view + editor access
// from their source gallery: if the user can view / edit the source,
// they can view / edit the saved filter. A direct grant on the saved
// filter extends access (e.g., expose a slice to a user who has no
// rights on the source) but never narrows — having source access
// always passes. Real and hybrid galleries take the direct grant
// check only.
const loadSourceFor = async (
  galleryId: string
): Promise<string | undefined> => {
  try {
    const gallery = (await db.loadGallery(galleryId)) as {
      type?: string;
      savedFilter?: { sourceGalleryId: string };
    };
    if (gallery.type === "saved_filter" && gallery.savedFilter) {
      return gallery.savedFilter.sourceGalleryId;
    }
  } catch {
    // Missing gallery falls through to direct-check semantics; the
    // caller's resolve() will throw NotFound / AccessError for it.
  }
  return undefined;
};

const authorizeGalleryView = async (
  userId: string,
  galleryId: string
): Promise<string> => {
  const direct = await resolve(userId, galleryId);
  if (direct.hasAccess) return galleryId;
  const source = await loadSourceFor(galleryId);
  if (source !== undefined) {
    const inherited = await resolve(userId, source);
    if (inherited.hasAccess) return galleryId;
  }
  throw new AccessError(undefined, { userId, galleryId, required: "view" });
};

// Gallery-editor tier. Backed by the `is_editor` flag on
// `user_gallery` / `group_gallery`. Global admins implicitly
// pass — they can do everything an editor can. Saved-filter
// galleries inherit editor from their source on the same
// extend-never-narrow rule as view.
const authorizeGalleryEditor = async (
  userId: string,
  galleryId: string
): Promise<string> => {
  if (await isGlobalAdmin(userId)) return galleryId;
  const direct = await resolve(userId, galleryId);
  if (direct.isEditor) return galleryId;
  const source = await loadSourceFor(galleryId);
  if (source !== undefined) {
    const inherited = await resolve(userId, source);
    if (inherited.isEditor) return galleryId;
  }
  throw new AccessError(undefined, {
    userId,
    galleryId,
    required: "gallery-editor",
  });
};

// Photo-level editor check: the user is allowed to edit the
// photo if they are global admin, or if they are gallery-editor
// on at least one of the galleries the photo is linked to. An
// orphan photo (no galleries) is only editable by global admin.
const authorizePhotoEditor = async (
  userId: string,
  photoId: string
): Promise<void> => {
  if (await isGlobalAdmin(userId)) return;
  const links = (await db.loadAllGalleryPhotoLinks()) as Array<{
    photoId: string;
    galleryId: string;
  }>;
  const galleryIds = links
    .filter((l) => l.photoId === photoId)
    .map((l) => l.galleryId);
  for (const galleryId of galleryIds) {
    const { isEditor } = await resolve(userId, galleryId);
    if (isEditor) return;
  }
  throw new AccessError(undefined, {
    userId,
    photoId,
    required: "gallery-editor",
  });
};

// Direct + group-derived gallery-editor grants for a user.
// Drives the login / refresh response so the client can render
// only the tiles the user can act on. The server still enforces
// every request — the client list is purely a rendering hint.
const loadEditorGalleries = async (userId: string): Promise<string[]> => {
  if (await isGlobalAdmin(userId)) {
    const all = (await db.loadGalleries()) as Array<{ id: string }>;
    return all.map((g) => g.id);
  }
  const galleries = (await db.loadGalleries()) as Array<{ id: string }>;
  const out: string[] = [];
  for (const g of galleries) {
    const { isEditor } = await resolve(userId, g.id);
    if (isEditor) out.push(g.id);
  }
  return out;
};
