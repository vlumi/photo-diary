// SPA roots served by the Fastify catch-all. Each entry is a path
// prefix the SPA owns end-to-end: refreshing or deep-linking any
// URL under one of these must serve index.html (so React Router
// can resolve the path client-side) rather than the JSON 404 the
// API uses for unknown routes. Keep in sync with the route table
// in react-app/src/App.tsx.
const SPA_ROOTS = ["/g", "/m", "/s"] as const;

export const isSpaRoute = (pathname: string): boolean => {
  return SPA_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`)
  );
};
