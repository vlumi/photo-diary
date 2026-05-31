import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Serialise test files. The API suite mounts the same Fastify
    // instance through supertest in every file, and concurrent calls
    // surfaced "Parse Error: Expected HTTP/" + ECONNRESET races.
    fileParallelism: false,
    // bcrypt at the production cost (10) starves the event loop when
    // many login flows run. 4 is the minimum bcrypt accepts.
    env: { BCRYPT_ROUNDS: "4" },
  },
});
