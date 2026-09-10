import supertest, { type Agent, type Response } from "supertest";
import { app } from "../../app.js";

// Pass Fastify's underlying http.Server to supertest. supertest binds
// an ephemeral port on first request; the listener lives for the
// whole test run. Routes are registered at module load, so `app.server`
// already knows the full pipeline — `init()` only needs to finish
// before the first request fires (handled by each file's `beforeEach`).
// One listening server per test file. When the server handed to
// supertest isn't listening, supertest calls listen(0) before every
// request and close() after it — and on the app shared by every test
// in the file, a close still draining a keep-alive socket races the
// next request's listen. That race is what surfaced as ECONNRESET and
// "Parse Error: Expected HTTP/", as empty-body 400s on valid requests,
// and, once the server wedged, as every later request in the file
// timing out.
beforeAll(async () => {
  await app.ready();
  await app.listen({ port: 0, host: "127.0.0.1" });
});

afterAll(async () => {
  await app.close();
});

export const createApi = () => {
  const api = supertest(app.server);
  return { api };
};

const extractCookie = (response: Response, name: string): string => {
  const cookies = response.headers["set-cookie"];
  const list = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  for (const c of list) {
    const m = new RegExp(`^${name}=([^;]+)`).exec(c);
    if (m) return m[1] as string;
  }
  throw new Error(`${name} cookie not set on response`);
};

export const loginUser = async (api: Agent, id: string): Promise<string> => {
  const authRes = await api
    .post("/api/v1/tokens")
    .send({
      id: id,
      password: "foobar",
    })
    .expect(200);
  return extractCookie(authRes, "pd_access");
};

// For tests that need the refresh-token half of the pair (refresh-flow,
// logout, etc.). Both halves are extracted from the Set-Cookie header
// the login response sets — pd_access carries the JWT used as the
// bearer-equivalent in subsequent `.set("Cookie", ...)` calls, pd_refresh
// is the rotation token the /refresh + /logout endpoints read.
export const loginUserPair = async (
  api: Agent,
  id: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  const authRes = await api
    .post("/api/v1/tokens")
    .send({
      id: id,
      password: "foobar",
    })
    .expect(200);
  return {
    accessToken: extractCookie(authRes, "pd_access"),
    refreshToken: extractCookie(authRes, "pd_refresh"),
  };
};
