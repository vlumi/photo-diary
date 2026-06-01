import { AccessError } from "./errors.js";
import db from "../db/index.js";

export default () => {
  return {
    authorizeView,
    authorizeAdmin,
    authorizeGalleryView,
    authorizeGalleryAdmin,
  };
};

// Driver-agnostic resolution. Any underlying failure surfaces as a
// uniform AccessError so the controllers don't have to distinguish
// "user not found" from "permission denied."
const resolve = async (
  userId: string,
  galleryId: string
): Promise<{ hasAccess: boolean; isAdmin: boolean }> => {
  try {
    return await db.resolveAccessLevel(userId, galleryId);
  } catch {
    return { hasAccess: false, isAdmin: false };
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

const authorizeGalleryAdmin = async (
  userId: string,
  galleryId: string
): Promise<string> => {
  const { isAdmin } = await resolve(userId, galleryId);
  if (!isAdmin) {
    throw new AccessError(undefined, { userId, galleryId, required: "admin" });
  }
  return galleryId;
};
