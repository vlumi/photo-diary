import { Type, type Static } from "typebox";

// The gallery as it goes over the wire. Mirrors `Gallery` in
// db/sqlite3/schema.ts plus `hideMap`, which the routes resolve for
// the requester. Same rules as the photo schema: exact nullability,
// open at every level, and `required` kept to the two fields the
// document has always promised. Value sets that may grow (`type`,
// `theme`, `initialView`, `epochType`) are strings, not enums.

const open = { additionalProperties: true } as const;
const LocalizedText = Type.Record(Type.String(), Type.String());

export const GallerySchema = Type.Object(
  {
    id: Type.String(),
    hideMap: Type.Boolean({
      description:
        "Whether the map is hidden from this requester; photo coordinates " +
        "are then null.",
    }),
    title: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    titleLocalized: Type.Optional(LocalizedText),
    descriptionLocalized: Type.Optional(LocalizedText),
    defaultLanguage: Type.Optional(
      Type.String({ description: "Language of `title` and `description`." })
    ),
    icon: Type.Optional(Type.String()),
    iconSource: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    epoch: Type.Optional(Type.String({ description: "YYYY-MM-DD, or empty." })),
    epochType: Type.Optional(Type.String()),
    theme: Type.Optional(Type.String()),
    initialView: Type.Optional(Type.String()),
    hostname: Type.Optional(Type.String()),
    type: Type.Optional(
      Type.String({ description: '"real", "hybrid" or "saved_filter".' })
    ),
    ordinal: Type.Optional(Type.Number()),
    sources: Type.Optional(Type.Array(Type.String())),
    savedFilter: Type.Optional(
      Type.Object(
        {
          sourceGalleryId: Type.String(),
          definition: Type.Object({}, open),
        },
        open
      )
    ),
  },
  { ...open, $id: "Gallery" }
);

export type GalleryWire = Static<typeof GallerySchema>;

export const GalleryRef = Type.Unsafe<GalleryWire>({ $ref: "Gallery#" });
