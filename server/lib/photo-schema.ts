import { Type, type Static } from "typebox";

// The photo as it goes over the wire, for the OpenAPI document and the
// response serializer. Mirrors `Photo` in db/sqlite3/schema.ts.
//
// Two things matter here beyond the field list. Fastify serializes
// through this schema and coerces rather than fails, so nullability is
// exact: a `null` under a plain `number` would go out as `0`. And
// `required` is both a permanent promise to clients that don't ship
// with the server and a serializer error when a value is missing, so
// it lists only what every photo has always had. Every level stays
// open (`additionalProperties: true`): nothing a route adds today
// (`galleries` on the admin lists, say) is dropped.

const open = { additionalProperties: true } as const;
const LocalizedText = Type.Record(Type.String(), Type.String());
const NullableNumber = Type.Union([Type.Number(), Type.Null()]);
const NullableInteger = Type.Union([Type.Integer(), Type.Null()]);

const Size = Type.Object(
  { width: Type.Optional(Type.Number()), height: Type.Optional(Type.Number()) },
  open
);
const Gear = Type.Object(
  {
    make: Type.Optional(Type.String()),
    model: Type.Optional(Type.String()),
    serial: Type.Optional(Type.String()),
  },
  open
);

export const PhotoSchema = Type.Object(
  {
    id: Type.String(),
    index: Type.Integer({
      description: "Position in the gallery's date order, from 0.",
    }),
    originalFilename: Type.Optional(Type.String()),
    title: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    titleLocalized: Type.Optional(LocalizedText),
    descriptionLocalized: Type.Optional(LocalizedText),
    taken: Type.Object(
      {
        instant: Type.Object(
          {
            timestamp: Type.Optional(
              Type.String({ description: "Local capture time, no zone." })
            ),
            year: NullableInteger,
            month: NullableInteger,
            day: NullableInteger,
            hour: Type.Optional(NullableInteger),
            minute: Type.Optional(NullableInteger),
            second: Type.Optional(NullableInteger),
          },
          {
            ...open,
            description:
              "Capture time in the photo's own local time. Every part is " +
              "null for a photo without a capture date.",
          }
        ),
        author: Type.Optional(Type.String()),
        location: Type.Optional(
          Type.Object(
            {
              country: Type.Optional(
                Type.String({ description: "ISO 3166-1 alpha-2, lower case." })
              ),
              place: Type.Optional(Type.String()),
              placeLocalized: Type.Optional(LocalizedText),
              coordinates: Type.Optional(
                Type.Object(
                  {
                    latitude: Type.Optional(NullableNumber),
                    longitude: Type.Optional(NullableNumber),
                    altitude: Type.Optional(NullableNumber),
                  },
                  {
                    ...open,
                    description:
                      "All null when the photo has no position, or when " +
                      "the gallery hides its map from the requester.",
                  }
                )
              ),
            },
            open
          )
        ),
      },
      open
    ),
    camera: Type.Optional(Gear),
    lens: Type.Optional(Gear),
    exposure: Type.Optional(
      Type.Object(
        {
          focalLength: Type.Optional(Type.Number()),
          focalLength35mmEquiv: Type.Optional(Type.Number()),
          aperture: Type.Optional(Type.Number()),
          exposureTime: Type.Optional(Type.Number({ description: "Seconds." })),
          iso: Type.Optional(Type.Number()),
        },
        open
      )
    ),
    dimensions: Type.Object({ original: Size, thumbnail: Size }, open),
    geocoded: Type.Optional(
      Type.Object(
        {
          countryCode: Type.Optional(Type.String()),
          stateCode: Type.Optional(Type.String()),
          city: Type.Optional(
            Type.String({ description: "In the requested `lang` when known." })
          ),
          cityEn: Type.Optional(Type.String()),
          address: Type.Optional(Type.Object({}, open)),
          noData: Type.Optional(Type.Boolean()),
        },
        open
      )
    ),
    exifAtIntake: Type.Optional(Type.Object({}, open)),
    isPrivate: Type.Optional(Type.Boolean()),
    renditions: Type.Optional(
      Type.Array(Type.Number(), {
        description:
          "Longest-edge sizes with a display rendition at " +
          "`display/<size>/<id>`. Absent or empty: assume 1500.",
      })
    ),
    galleries: Type.Optional(
      Type.Array(Type.String(), {
        description: "Galleries holding the photo; cross-gallery routes only.",
      })
    ),
  },
  { ...open, $id: "Photo" }
);

export type PhotoWire = Static<typeof PhotoSchema>;

/** Refers to the shared component, so the document carries the shape once. */
export const PhotoRef = Type.Unsafe<PhotoWire>({ $ref: "Photo#" });

const INSTANT_PARTS = ["year", "month", "day", "hour", "minute", "second"] as const;

type Undated = { taken?: { instant?: Record<string, unknown> } };

// A photo without a capture date carries NaN in every part of its
// instant. `JSON.stringify` used to turn those into null on the way
// out; a schema-driven serializer refuses them. Copies rather than
// edits, so the NaN that sorting and filtering see stays put.
const datedForWire = <T>(photo: T): T => {
  const instant = (photo as Undated | null)?.taken?.instant;
  if (!instant || !INSTANT_PARTS.some((part) => Number.isNaN(instant[part]))) {
    return photo;
  }
  const parts = Object.fromEntries(
    INSTANT_PARTS.map((part) => [
      part,
      Number.isNaN(instant[part]) ? null : instant[part],
    ])
  );
  const taken = (photo as Undated).taken;
  return { ...photo, taken: { ...taken, instant: { ...instant, ...parts } } };
};

const PHOTO_SLOTS = ["previous", "next", "first", "last"] as const;

/**
 * `preSerialization` step for the routes that return photos: a bare
 * photo, a list, `{ photos }`, or the neighbors envelope.
 */
export const photosForWire = <T>(payload: T): T => {
  if (Array.isArray(payload)) return payload.map(datedForWire) as T;
  if (!payload || typeof payload !== "object") return payload;
  const envelope = payload as Record<string, unknown>;
  if (Array.isArray(envelope.photos)) {
    return { ...envelope, photos: envelope.photos.map(datedForWire) } as T;
  }
  if (PHOTO_SLOTS.some((slot) => slot in envelope)) {
    const slots = Object.fromEntries(
      PHOTO_SLOTS.filter((slot) => slot in envelope).map((slot) => [
        slot,
        datedForWire(envelope[slot]),
      ])
    );
    return { ...envelope, ...slots } as T;
  }
  return datedForWire(payload);
};
