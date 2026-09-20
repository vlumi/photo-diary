import Fastify from "fastify";
import { Type } from "typebox";

import { PhotoRef, PhotoSchema, photosForWire } from "../../lib/photo-schema.js";

// Fastify serializes a typed response through its schema and coerces
// instead of failing: null under a plain number goes out as 0, null
// under a string as "", 1.7 under an integer as 1. These tests send
// awkward photos through a real Fastify serializer and expect exactly
// what `JSON.stringify` used to produce.

const full = {
  id: "full.jpg",
  index: 3,
  originalFilename: "DSC_0001.NEF",
  title: "",
  description: "",
  titleLocalized: { ja: "題" },
  descriptionLocalized: {},
  taken: {
    instant: {
      timestamp: "2024-06-01 12:34:56",
      year: 2024,
      month: 6,
      day: 1,
      hour: 12,
      minute: 34,
      second: 56,
    },
    author: "",
    location: {
      country: "jp",
      place: "",
      placeLocalized: {},
      coordinates: { latitude: 35.6812, longitude: 139.7671, altitude: 3.5 },
    },
  },
  camera: { make: "NIKON", model: "Z 6", serial: "123" },
  lens: { make: "", model: "", serial: "" },
  exposure: { focalLength: 35.5, aperture: 1.8, exposureTime: 0.004, iso: 100 },
  dimensions: {
    original: { width: 6048, height: 4024 },
    thumbnail: { width: 300, height: 199.6 },
  },
  geocoded: {
    countryCode: "jp",
    city: "千代田区",
    cityEn: "Chiyoda",
    address: { suburb: "Marunouchi", postcode: "100-0005", nested: { a: [1, null] } },
    noData: false,
  },
  exifAtIntake: { anything: { goes: [1, "two", null] } },
  isPrivate: false,
  renditions: [1500, 3000],
  galleries: ["gallery1"],
  // Nothing declared, at three levels: must pass through untouched.
  somethingNewer: { kept: true },
};

const bare = {
  id: "bare.jpg",
  index: 0,
  title: "",
  taken: {
    instant: { timestamp: "2020-01-02 00:00:00", year: 2020, month: 1, day: 2, hour: 0, minute: 0, second: 0 },
    author: "",
    location: { place: "", coordinates: { latitude: null, longitude: null, altitude: null } },
  },
  camera: { make: "", model: "", serial: "" },
  exposure: {},
  dimensions: { original: {}, thumbnail: {} },
  geocoded: { noData: true },
  isPrivate: true,
  renditions: [],
};

const undated = {
  ...bare,
  id: "undated.jpg",
  taken: {
    ...bare.taken,
    instant: { timestamp: "", year: NaN, month: NaN, day: NaN, hour: NaN, minute: NaN, second: NaN },
  },
};

const asJsonStringifyWould = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value));

const serve = async (schema: unknown, payload: unknown) => {
  const app = Fastify();
  app.addSchema(PhotoSchema);
  app.addHook("preSerialization", async (_request, _reply, body) =>
    photosForWire(body)
  );
  app.get("/", { schema: { response: { 200: schema } } }, async () => payload);
  const response = await app.inject({ method: "GET", url: "/" });
  await app.close();
  expect(response.statusCode).toBe(200);
  return response.json() as unknown;
};

describe("photo wire schema", () => {
  test.each([
    ["every field, floats, blobs and undeclared keys", full],
    ["no coordinates, no exposure, no sizes", bare],
    ["no capture date", undated],
  ])("a photo with %s goes out as it always did", async (_name, photo) => {
    expect(await serve(PhotoRef, photo)).toEqual(asJsonStringifyWould(photo));
  });

  test("an undated photo keeps its NaN for the code that sorts and filters", async () => {
    await serve(PhotoRef, undated);
    expect(Number.isNaN(undated.taken.instant.year)).toBe(true);
  });

  test("the envelopes photos travel in are all covered", async () => {
    const list = [full, undated, bare];
    expect(await serve(Type.Array(PhotoRef), list)).toEqual(asJsonStringifyWould(list));

    const counted = { photos: list, total: 3 };
    const Counted = Type.Object({ photos: Type.Array(PhotoRef), total: Type.Integer() });
    expect(await serve(Counted, counted)).toEqual(asJsonStringifyWould(counted));

    const neighbors = { previous: undated, last: full };
    const Neighbors = Type.Object({
      previous: Type.Optional(PhotoRef),
      next: Type.Optional(PhotoRef),
      first: Type.Optional(PhotoRef),
      last: Type.Optional(PhotoRef),
    });
    expect(await serve(Neighbors, neighbors)).toEqual(asJsonStringifyWould(neighbors));
  });
});
