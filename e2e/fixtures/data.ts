// E2E fixture data. Tight subset of what server/tests/api/fixture.ts
// seeds — just enough users + galleries + photos to exercise the
// regression-prone flows (#261). The shape mirrors the server-side
// constants so a future refactor that consolidates both into one
// shared module is mechanical.

export const FIXTURE_PASSWORD = "foobar";
// bcrypt cost-10 hash of "foobar". Same constant the server tests use;
// bcrypt verifies fine regardless of the server's BCRYPT_ROUNDS env.
export const FIXTURE_PASSWORD_HASH =
  "$2b$10$7edID90/TmAdhGtJRqjDj.hBzXEJZorgDYZ9jwPcdDdqceYlaQ2ZG";

export const USERS = [
  { id: "admin", isAdmin: true },
  { id: "alice", isAdmin: false },
] as const;

export const GALLERIES = [
  {
    id: "alpha",
    title: "Alpha gallery",
    description: "Alpha gallery (E2E fixture)",
    theme: "blue",
  },
] as const;

// Alice has direct access to alpha. :guest doesn't, so unauthenticated
// requests against /api/v1/gallery-photos/alpha return 403/404 —
// useful for the post-logout cache-cleared assertion.
export const ACCESS = [
  { user: "alice", gallery: "alpha", isEditor: false },
] as const;

export const PHOTOS = [
  {
    id: "alpha-tokyo.jpg",
    index: 0,
    timestamp: "2024-05-04 13:13:03",
    year: 2024,
    month: 5,
    day: 4,
    hour: 13,
    minute: 13,
    second: 3,
    country: "jp",
    latitude: 35.6595,
    longitude: 139.7005,
    cameraMake: "FUJIFILM",
    cameraModel: "X-T2",
    focalLength: 27,
    aperture: 5.6,
    exposureTime: 0.0008,
    iso: 200,
  },
] as const;

export const LINKS: Record<string, string[]> = {
  alpha: ["alpha-tokyo.jpg"],
};
