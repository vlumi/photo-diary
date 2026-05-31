import type { FastifyRequest } from "fastify";

import dbFacade from "../db/index.js";
import { NotFoundError } from "./errors.js";

// Resolve the host-scope for an incoming hostname: the set of gallery
// ids whose `hostname` regex matches. An empty array means "primary
// host" — admin endpoints are unscoped. A non-empty array means the
// admin surface is narrowed to those galleries; the user can still
// switch between them in the breadcrumb dropdown, but cross-gallery
// admin (user CRUD, gallery CRUD, instance meta) is unreachable.
//
// Multiple matches are intentional: an operator can run `*.misaki.fi`
// for a regional roll-up of several galleries while still pinning a
// specific subdomain to one of them via a tighter pattern.
//
// `gallery.hostname` is stored as a regex source string (see
// `bin/gallery.ts --hostname`). An invalid pattern is treated as
// "doesn't match" — the operator's misconfiguration shouldn't take
// the server down.
export const resolveHostScope = async (
  hostname: string
): Promise<string[]> => {
  const galleries = (await dbFacade.loadGalleries()) as Array<{
    id: string;
    hostname?: string;
  }>;
  const matches: string[] = [];
  for (const gallery of galleries) {
    if (!gallery.hostname) continue;
    try {
      if (new RegExp(gallery.hostname).test(hostname)) {
        matches.push(gallery.id);
      }
    } catch {
      // Bad regex — skip; don't blow up unrelated requests.
    }
  }
  return matches;
};

// Guards for use in route handlers. Each throws `NotFoundError` so the
// scoped host responds the same way it would for a non-existent route
// — no leak of "this endpoint exists but you can't use it here."

const isScoped = (request: FastifyRequest): boolean =>
  !!request.galleryScope && request.galleryScope.length > 0;

export const requireUnscoped = (request: FastifyRequest): void => {
  if (isScoped(request)) throw new NotFoundError();
};

export const requireScopeMatches = (
  request: FastifyRequest,
  galleryId: string
): void => {
  if (isScoped(request) && !request.galleryScope!.includes(galleryId)) {
    throw new NotFoundError();
  }
};

// For routes that operate on a photo by id: when scoped, the photo
// must be linked to at least one gallery in the scope set. Reuses the
// existing gallery-photo lookup (which already throws `NotFoundError`
// on miss), so the network shape is unchanged.
export const requirePhotoInScope = async (
  request: FastifyRequest,
  photoId: string
): Promise<void> => {
  if (!isScoped(request)) return;
  for (const galleryId of request.galleryScope!) {
    try {
      await dbFacade.loadGalleryPhoto(galleryId, photoId);
      return;
    } catch {
      // try the next scope gallery
    }
  }
  throw new NotFoundError();
};

// Collect the set of photo ids linked to any in-scope gallery. Used by
// list endpoints that want to narrow a global photo set to the
// host-scoped view. Returns `null` when unscoped — caller should
// shortcut "no narrowing needed."
export const collectScopePhotoIds = async (
  request: FastifyRequest
): Promise<Set<string> | null> => {
  if (!isScoped(request)) return null;
  const ids = new Set<string>();
  for (const galleryId of request.galleryScope!) {
    const photos = (await dbFacade.loadGalleryPhotos(galleryId)) as Array<{
      id: string;
    }>;
    for (const photo of photos) ids.add(photo.id);
  }
  return ids;
};
