// Live CSP directives. The `instance_cdn` meta entry can be
// changed while the server is running (via /m/instance), and the
// CSP header needs to pick up the new origin without a pm2
// restart — otherwise photos from the new CDN get blocked by the
// still-baked-in old header.
//
// Kept as an in-memory cache primed at boot and refreshed whenever
// the meta model writes to `instance_cdn`. The onSend hook in
// `app.ts` reads `getCspHeader()` and rewrites the CSP header per
// response.
//
// Caveat: `bin/meta.ts` writes go through the driver directly,
// bypassing the model's refresh hook, and run in a separate
// process from the server anyway. Operators who change
// `instance_cdn` via the CLI still need to `pm2 restart` for the
// running server to pick it up. `/m/instance` is the ergonomic
// path.

let cdnOrigin: string | undefined = undefined;

// Static portion of the header — everything except the CDN origin
// which is spliced in dynamically. Kept in one place so future
// tweaks touch just this file. See `app.ts` for the original
// per-directive rationale comments.
const STATIC_DIRECTIVES: Array<[string, string[]]> = [
  ["default-src", ["'self'"]],
  ["script-src", ["'self'"]],
  ["style-src", ["'self'", "'unsafe-inline'"]],
  ["connect-src", ["'self'"]],
  ["font-src", ["'self'", "data:"]],
  ["frame-ancestors", ["'none'"]],
  ["base-uri", ["'self'"]],
  ["form-action", ["'self'"]],
  ["object-src", ["'none'"]],
  ["script-src-attr", ["'none'"]],
  ["upgrade-insecure-requests", []],
];

const buildImgSrc = (): string[] => [
  "'self'",
  "data:",
  "blob:",
  "https://*.tile.openstreetmap.org",
  "https://cdn.jsdelivr.net",
  ...(cdnOrigin ? [cdnOrigin] : []),
];

const cachedHeader = (): string => {
  const directives = STATIC_DIRECTIVES.map(([k, v]) =>
    v.length > 0 ? `${k} ${v.join(" ")}` : k
  );
  directives.push(`img-src ${buildImgSrc().join(" ")}`);
  return directives.join(";");
};

// Prime / update the cached origin from an operator-facing CDN
// value. Called at boot with the value read from the meta table,
// and by the meta model on every write to `instance_cdn`.
export const setCspCdn = (cdn: string | undefined): void => {
  if (!cdn) {
    cdnOrigin = undefined;
    return;
  }
  try {
    cdnOrigin = new URL(cdn).origin;
  } catch {
    // Malformed URL — leave the previous value in place. A future
    // write with a valid URL overwrites.
  }
};

export const getCspHeader = (): string => cachedHeader();
