import supertest, { type Agent } from "supertest";
import { app } from "../../app.js";

// Pass Fastify's underlying http.Server to supertest. supertest binds
// an ephemeral port on first request; the listener lives for the
// whole test run. Routes are registered at module load, so `app.server`
// already knows the full pipeline — `init()` only needs to finish
// before the first request fires (handled by each file's `beforeEach`).
export const createApi = () => {
  const api = supertest(app.server);
  return { api };
};

export const loginUser = async (api: Agent, id: string): Promise<string> => {
  const authRes = await api
    .post("/api/v1/tokens")
    .send({
      id: id,
      password: "foobar",
    })
    .expect(200);
  return authRes.body.accessToken;
};

// For tests that need the refresh-token half of the pair (refresh-flow,
// logout, etc.).
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
    accessToken: authRes.body.accessToken,
    refreshToken: authRes.body.refreshToken,
  };
};
