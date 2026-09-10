import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Serialise test files: the API suite shares one in-memory
    // SQLite and one Fastify instance per worker, and every file
    // reseeds them.
    fileParallelism: false,
    // No retry. The intermittent hook timeouts, ECONNRESETs and
    // empty-body 400s that once justified one were the supertest
    // listen/close race, fixed in tests/api/helper.ts; a failure now
    // is a failure.
    // bcrypt at the production cost (10) starves the event loop when
    // many login flows run. 4 is the minimum bcrypt accepts.
    env: { BCRYPT_ROUNDS: "4" },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["**/*.ts"],
      exclude: [
        "tests/**",
        "bin/**",
        "**/*.test.ts",
        "vitest.config.js",
        "eslint.config.js",
        "openapi.json",
        "db/sqlite3/migrations/**",
      ],
    },
  },
});
