import type { Gallery } from "../models/GalleryModel";

// Compute the host-scope from a galleries list + the current hostname.
// Mirrors the server-side resolver in `server/lib/host-scope.ts`:
// galleries whose `hostname` regex matches make up the scope set.
//
// An empty set means "primary host" — the SPA is unscoped, every
// accessible gallery is reachable. A non-empty set means the SPA is
// scoped to those galleries; the breadcrumb dropdown should filter to
// them, and URLs targeting galleries outside the set should redirect
// in.
//
// Multiple matches are intentional and not an error (an operator may
// run `*.misaki.fi` for a regional roll-up while pinning specific
// subdomains to individual galleries via tighter patterns).
export const galleriesForHost = (
  galleries: Gallery[],
  hostname: string
): Gallery[] => galleries.filter((gallery) => gallery.matchesHostname(hostname));
