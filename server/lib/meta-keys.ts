// Single source of truth for the meta keys the operator surface
// (CLI + API) is allowed to read/write. The DB stores them with
// the `instance_` prefix (`cleanMeta` strips it for HTTP responses);
// this module keeps both forms so each caller can pick what it
// needs.
//
// `schema_version` is the migration runner's cursor — hard-blocked
// from both CLI (`--force` can't override it) and the API. Reach
// for raw SQL if you really need to touch it.

// Public form (what the HTTP API accepts). Keep this in sync with
// `KNOWN_META_KEYS_INTERNAL` below.
export const KNOWN_META_KEYS_PUBLIC = [
  "name",
  "description",
  "cdn",
  "image",
] as const;
export type KnownMetaKeyPublic = (typeof KNOWN_META_KEYS_PUBLIC)[number];

// Internal form (`instance_<name>`) as stored in the `meta` table
// and used by `bin/meta.ts`.
export const KNOWN_META_KEYS_INTERNAL = [
  "instance_name",
  "instance_description",
  "instance_cdn",
  "instance_image",
] as const;
export type KnownMetaKeyInternal = (typeof KNOWN_META_KEYS_INTERNAL)[number];

export const PROTECTED_META_KEYS = ["schema_version"] as const;
