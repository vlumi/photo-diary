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

const authorizeGalleryView = async (
  userId: string,
  galleryId: string
): Promise<string> => {
  const { hasAccess } = await resolve(userId, galleryId);
  if (!hasAccess) {
    throw new AccessError(undefined, { userId, galleryId, required: "view" });
  }
  return galleryId;
};

// Gallery-editor tier. Backed by the `is_admin` flag on
// `user_gallery` / `group_gallery` — the column name predates the
// tier name; the column stays so old grants keep working. Global
// admins implicitly pass: they can do everything an editor can.
const authorizeGalleryEditor = async (
  userId: string,
  galleryId: string
): Promise<string> => {
  if (await isGlobalAdmin(userId)) return galleryId;
  const { isEditor } = await resolve(userId, galleryId);
  if (!isEditor) {
    throw new AccessError(undefined, {
      userId,
      galleryId,
      required: "gallery-editor",
    });
  }
  return galleryId;
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
