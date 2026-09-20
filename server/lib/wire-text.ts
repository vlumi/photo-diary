// The database layer hands back "" for text that isn't there; numbers
// that aren't there are simply absent. On the wire both are absent, so
// a client has one way to ask "is there a title?". Done here rather
// than in the row mappers because grouping, filtering and the admin
// forms' own round trip lean on the "".

// Operator- or machine-written blobs pass through as they are: an
// empty string inside raw EXIF or a geocoder's answer is data.
const OPAQUE = new Set([
  "exifAtIntake",
  "address",
  "definition",
  "titleLocalized",
  "descriptionLocalized",
  "placeLocalized",
]);

/** A copy of `value` without its empty-string properties, at any depth. */
export const withoutEmptyText = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(withoutEmptyText) as T;
  if (!value || typeof value !== "object") return value;
  const kept: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === "") continue;
    kept[key] = OPAQUE.has(key) ? entry : withoutEmptyText(entry);
  }
  return kept as T;
};
