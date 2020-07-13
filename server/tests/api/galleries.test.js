const supertest = require("supertest");
const app = require("../../app");

const api = supertest(app);

beforeEach(async () => {});

test("Returned in JSON", async () => {
  await api
    .get("/api/galleries")
    .expect(200)
    .expect("Content-Type", /application\/json/);
});

afterAll(() => {});
