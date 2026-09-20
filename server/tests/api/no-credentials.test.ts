import { vi } from "vitest";
import { TEST_CONFIG, seedApiFixture } from "./fixture.js";

vi.mock("../../lib/config/index.js", () => ({ default: TEST_CONFIG }));

import { app, init } from "../../app.js";
import { createApi, loginUser } from "./helper.js";

const { api } = createApi();

beforeEach(async () => {
  await seedApiFixture();
  await init();
});

// A route that returns a database row as it is sends whatever the row
// holds. `GET /users/:userId` once sent the password hash and the
// token-signing secret that way. This reads every GET route as the
// most privileged user and refuses anything that looks like a
// credential, at any depth.
const CREDENTIAL_LIKE = /pass|secret|hash|token/i;

const FIXTURE_IDS: Record<string, string> = {
  galleryId: "gallery1",
  photoId: "gallery1photo.jpg",
  userId: "plainuser",
  groupId: "family",
  key: "name",
  filterId: "none",
  originalFilename: "none",
};

const credentialLikeKeys = (value: unknown, path = ""): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => credentialLikeKeys(entry, `${path}[]`));
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, entry]) => [
    ...(CREDENTIAL_LIKE.test(key) ? [`${path}.${key}`] : []),
    ...credentialLikeKeys(entry, `${path}.${key}`),
  ]);
};

test("no read route sends anything that looks like a credential", async () => {
  const token = await loginUser(api, "admin");
  const spec = app.swagger() as unknown as {
    paths: Record<string, Record<string, unknown>>;
  };
  const found: string[] = [];
  let answered = 0;
  for (const [path, operations] of Object.entries(spec.paths)) {
    // SSO consumption needs a ticket and redirects; nothing to read.
    if (!("get" in operations) || path.endsWith("/tokens/sso")) continue;
    const url = path.replace(/\{(\w+)\}/g, (_, name: string) => FIXTURE_IDS[name] ?? "none");
    const response = await api.get(url).set("Cookie", `pd_access=${token}`);
    if (response.status !== 200) continue;
    answered++;
    found.push(...credentialLikeKeys(response.body).map((key) => `GET ${path} ${key}`));
  }
  // Guards the guard: most routes must actually have been read.
  expect(answered).toBeGreaterThan(15);
  expect([...new Set(found)]).toEqual([]);
});
