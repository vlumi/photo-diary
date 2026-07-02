// Best-effort path translation when the operator hops between
// virtual hosts.
//
// Operator model: the main host exposes every gallery; non-main
// hosts are scope-narrowed subsets. Carrying the gallery id
// verbatim across hops works for both directions — non-main → main
// lands on the exact same gallery (main has it), main → non-main
// lands on an off-scope URL that the target's Gallery view catches
// and redirects to the scoped default (see Gallery/index.tsx),
// preserving the year / month / day trail.

export const translatePathForHost = (currentPath: string): string => {
  if (!currentPath.startsWith("/")) return "/";

  // Admin paths don't translate — galleries / users / groups are
  // per-host. Land on the manage dashboard.
  if (currentPath === "/m" || currentPath.startsWith("/m/")) return "/m";

  // Everything else carries over verbatim. Off-scope /g/<id> URLs
  // on the target host go through the existing off-scope handler.
  return currentPath;
};
