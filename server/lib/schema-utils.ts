import { Type } from "typebox";

// `Type.Union([Type.Literal("a"), Type.Literal("b")])` emits JSON
// Schema `{ anyOf: [{ type: "string", enum: ["a"] }, ...] }`, which
// Swagger UI can't render as a dropdown — it falls back to a free-
// form text field. The canonical JSON-Schema enum shape (a single
// `type: "string", enum: [...]`) renders as a `<select>` instead.
//
// `Type.String({ enum })` isn't supported by TypeBox 1.x (TStringOptions
// has no `enum` field), so we drop down to `Type.Unsafe` and inject
// the JSON Schema directly. The TS-side type stays narrow (union of
// the literal values), so callers keep type safety at the consumption
// site.
export const StringEnum = <T extends string>(values: readonly T[]) =>
  Type.Unsafe<T>({ type: "string", enum: [...values] });

