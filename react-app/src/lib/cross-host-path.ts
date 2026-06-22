// Best-effort path translation when the operator hops between
// virtual hosts (#664). Each host serves a different gallery set,
// so a deep URL like /g/dailybw/2024/3 only makes sense on its own
// host; we keep the *shape* (year / month / day / stats) where
// reasonable and let the target host pick a default gallery on
// arrival.

// Visitor calendar shape: /g/<id>/<y>?/<m>?/<d>?/<photoId>?.
// Strip the gallery id from the path so the target host falls back
// to its own default gallery (the `instance_defaultGallery` meta
// + hostname-scope landing logic). Keep the rest of the trail so
// the visitor stays on the same date / view.
const STRIP_GALLERY = /^\/g\/[^/]+(\/.*)?$/;

// Per-gallery stats: /s/<id>. Drop the id; target lands on its
// own /s with whatever heuristic picks the default.
const STRIP_STATS = /^\/s\/[^/]+(\/.*)?$/;

export const translatePathForHost = (currentPath: string): string => {
  if (!currentPath.startsWith("/")) return "/";

  // Admin paths don't translate — galleries / users / groups are
  // per-host. Land on the manage dashboard.
  if (currentPath === "/m" || currentPath.startsWith("/m/")) return "/m";

  // Per-gallery surfaces — keep the date / photo trail, drop the
  // gallery id so the target picks its own default.
  const galleryMatch = STRIP_GALLERY.exec(currentPath);
  if (galleryMatch) return "/g" + (galleryMatch[1] ?? "");

  const statsMatch = STRIP_STATS.exec(currentPath);
  if (statsMatch) return "/s" + (statsMatch[1] ?? "");

  // Top-level routes (/, /g, /s) carry over verbatim.
  return currentPath;
};
