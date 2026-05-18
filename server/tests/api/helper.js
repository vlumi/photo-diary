const supertest = require("supertest");
const { app } = require("../../app");

// Create one persistent server per test file. Letting supertest spin up an
// ephemeral server per request causes intermittent "Parse Error: Expected
// HTTP/" failures (port-reuse race between consecutive ephemeral servers).
const createApi = () => {
  const server = app.listen();
  const api = supertest(server);
  const close = () => new Promise((resolve) => server.close(resolve));
  return { api, close };
};

const loginUser = async (api, id) => {
  const authRes = await api
    .post("/api/v1/tokens")
    .send({
      id: id,
      password: "foobar",
    })
    .expect(200);
  return authRes.body.token;
};

module.exports = {
  createApi,
  loginUser,
};
