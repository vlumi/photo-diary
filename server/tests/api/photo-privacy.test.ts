import { vi } from "vitest";
import { TEST_CONFIG, seedApiFixture } from "./fixture.js";

vi.mock("../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

import { init } from "../../app.js";
import db from "../../db/index.js";
import { createApi, loginUser } from "./helper.js";

const { api } = createApi();

const PHOTO = "gallery1photo.jpg";
const EXIF = { GPSLatitude: 35.68, LensSerialNumber: "L-1", anything: "else" };
const ADDRESS = { neighbourhood: "Marunouchi", postcode: "100-0005" };

beforeEach(async () => {
  await seedApiFixture();
  await init();
  await db.updatePhoto(PHOTO, {
    originalFilename: "DSC_0001.NEF",
    exifAtIntake: EXIF,
    lens: { serial: "L-1" },
    taken: { location: { coordinates: { latitude: 35.68, longitude: 139.76 } } },
    geocoded: { address: ADDRESS },
  });
});

type Wire = {
  id: string;
  originalFilename?: string;
  exifAtIntake?: unknown;
  camera: { make?: string; serial?: string };
  lens: { serial?: string };
  geocoded: { address?: unknown };
  taken: { location: { coordinates: { latitude: number | null } } };
};

// Every route that sends gallery1's photos to a viewer.
const fetchEverywhere = async (cookie?: string): Promise<Wire[]> => {
  const as = <T extends { set: (k: string, v: string) => T }>(request: T) =>
    cookie ? request.set("Cookie", `pd_access=${cookie}`) : request;
  const pick = (photos: Wire[]) => photos.find((p) => p.id === PHOTO)!;
  const list = await as(api.get("/api/v1/gallery-photos/gallery1")).expect(200);
  const query = await as(api.post("/api/v1/gallery-photos/gallery1/query"))
    .send({})
    .expect(200);
  const one = await as(api.get(`/api/v1/gallery-photos/gallery1/${PHOTO}`)).expect(200);
  const byName = await as(
    api.get("/api/v1/gallery-photos/gallery1/by-original-filename/DSC_0001.NEF")
  ).expect(200);
  const gallery = await as(api.get("/api/v1/galleries/gallery1")).expect(200);
  const neighbors = await as(api.post("/api/v1/gallery-photos/gallery1/neighbors"))
    .send({ photoId: PHOTO })
    .expect(200);
  const slots = Object.values(neighbors.body as Record<string, Wire | undefined>).filter(
    (p): p is Wire => !!p && typeof p === "object"
  );
  expect(slots.length).toBeGreaterThan(0);
  return [
    pick(list.body),
    pick(query.body),
    one.body,
    byName.body,
    pick(gallery.body.photos),
    ...slots,
  ];
};

describe("what a viewer is sent of a photo", () => {
  test("someone who can edit it gets everything", async () => {
    for (const user of ["admin", "gallery1admin"]) {
      const token = await loginUser(api, user);
      for (const photo of await fetchEverywhere(token)) {
        if (photo.id !== PHOTO) continue;
        expect(photo.originalFilename).toBe("DSC_0001.NEF");
        expect(photo.exifAtIntake).toEqual(EXIF);
        expect(photo.camera.serial).toBe("123");
        expect(photo.lens.serial).toBe("L-1");
        expect(photo.geocoded.address).toEqual(ADDRESS);
      }
    }
  });

  test("a viewer gets no raw EXIF, filename or serials, on any route", async () => {
    const token = await loginUser(api, "gallery1user");
    for (const photo of await fetchEverywhere(token)) {
      expect(photo).not.toHaveProperty("originalFilename");
      expect(photo).not.toHaveProperty("exifAtIntake");
      expect(photo.camera).not.toHaveProperty("serial");
      expect(photo.lens).not.toHaveProperty("serial");
    }
    const [shown] = await fetchEverywhere(token);
    // What the public views do show stays.
    expect(shown!.camera.make).toBeDefined();
    expect(shown!.geocoded.address).toEqual(ADDRESS);
    expect(shown!.taken.location.coordinates.latitude).toBe(35.68);
  });

  test("with the map hidden, the address goes with the coordinates", async () => {
    const admin = await loginUser(api, "admin");
    await api
      .put("/api/v1/user-gallery/gallery1user/gallery1")
      .set("Cookie", `pd_access=${admin}`)
      .send({ isEditor: false, hideMap: true })
      .expect(204);
    const token = await loginUser(api, "gallery1user");
    for (const photo of await fetchEverywhere(token)) {
      expect(photo.taken.location.coordinates.latitude).toBeNull();
      expect(photo.geocoded).not.toHaveProperty("address");
      expect(photo).not.toHaveProperty("exifAtIntake");
    }
  });
});
