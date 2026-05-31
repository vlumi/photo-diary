import type { onRequestHookHandler } from "fastify";

import { resolveHostScope } from "../host-scope.js";

// Sets `request.galleryScope` early in the request lifecycle so route
// handlers and guards in `lib/host-scope.ts` can consult it without
// re-resolving. Runs unconditionally — non-API requests (static SPA
// assets) pay one cheap DB lookup, which is fine because the gallery
// list is small and resolution is bounded.
const hostScopeFilter: onRequestHookHandler = async (request) => {
  request.galleryScope = await resolveHostScope(request.hostname);
};

export default hostScopeFilter;
