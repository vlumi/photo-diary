import { ValidationError } from "./errors.js";

// Canonical slug pattern for new user / gallery / group ids:
// lowercase alnum + underscore / hyphen, starts with alnum. URL-safe;
// rules out the `:` sigil reserved for pseudo-ids like `:guest`.
//
// Existing data is lowercased by migration 017 but isn't re-validated
// against the slug shape — anything older than the migration that
// already had spaces / dots / etc. stays. New creates via API or CLI
// must follow the pattern.
// Source of truth on the server side. TypeBox schemas import the
// string for `pattern:` fields; `assertSlugId` uses the compiled
// RegExp for model-layer validation. The client mirrors the same
// string in `react-app/src/lib/id-shape.ts`.
export const ID_PATTERN_SOURCE = "^[a-z0-9][a-z0-9_-]*$";
export const ID_PATTERN = new RegExp(ID_PATTERN_SOURCE);

export const assertSlugId = (id: string): void => {
  if (!ID_PATTERN.test(id)) {
    throw new ValidationError(
      `id "${id}" must be lowercase alnum, may contain '_' / '-', and start with alnum`
    );
  }
};
