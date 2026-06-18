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
//
// Two flavours sit in the same key namespace:
//
// 1. Instance identity rows (`name`, `description`, `cdn`, `image`)
//    — DB-backed, edited via the admin UI or `bin/meta.ts`.
// 2. SPA runtime defaults (`defaultGallery` / `defaultTheme` /
//    `defaultLanguage` / `initialGalleryView` / `firstWeekday` /
//    `betaFeatures`). The meta row is the source of truth; unset
//    keys fall through to the SPA's bundled defaults in
//    `lib/config.ts`.
//
// `betaFeatures` is stored as a JSON-encoded `{name: "on" | "off"
// | "user"}` map so the per-feature opt-in shape survives the
// flat key/value table.
export const KNOWN_META_KEYS_PUBLIC = [
  "name",
  "description",
  "cdn",
  "image",
  "defaultGallery",
  "defaultTheme",
  "defaultLanguage",
  "initialGalleryView",
  "firstWeekday",
  "betaFeatures",
  "renditions",
] as const;
export type KnownMetaKeyPublic = (typeof KNOWN_META_KEYS_PUBLIC)[number];

// Internal form (`instance_<name>`) as stored in the `meta` table
// and used by `bin/meta.ts`.
export const KNOWN_META_KEYS_INTERNAL = [
  "instance_name",
  "instance_description",
  "instance_cdn",
  "instance_image",
  "instance_defaultGallery",
  "instance_defaultTheme",
  "instance_defaultLanguage",
  "instance_initialGalleryView",
  "instance_firstWeekday",
  "instance_betaFeatures",
  "instance_renditions",
] as const;
export type KnownMetaKeyInternal = (typeof KNOWN_META_KEYS_INTERNAL)[number];

export const PROTECTED_META_KEYS = ["schema_version"] as const;
