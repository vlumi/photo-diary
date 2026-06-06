// Mirror of `server/lib/id-shape.ts`. Slug shape for new user /
// gallery / group ids: lowercase alnum + underscore / hyphen,
// starts with alnum. Used by the Create form components for
// live invalid-border feedback; the server enforces the same
// pattern via TypeBox + the model-layer `assertSlugId` helper.
export const ID_PATTERN_SOURCE = "^[a-z0-9][a-z0-9_-]*$";
export const ID_PATTERN = new RegExp(ID_PATTERN_SOURCE);
