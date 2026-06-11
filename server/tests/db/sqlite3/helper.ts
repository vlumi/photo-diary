// Shared driver-loader for sqlite3 parity tests. Each test file
// must still call `vi.mock("../../../lib/config/index.js", () =>
// ({ default: TEST_CONFIG }))` at its top level — `vi.mock` is
// hoisted per file and can't live in this helper.
import type { Gallery } from "../../../db/sqlite3/schema.js";

export const TEST_CONFIG = {
  ENV: "test",
  PORT: "0",
  SECRET: "test-secret",
  DEBUG: false,
  DB_DRIVER: "sqlite3",
  DB_OPTS: ":memory:",
};

export const loadDriver = async () => {
  const factory = await import("../../../db/sqlite3/index.js");
  return factory.default();
};

export type Driver = Awaited<ReturnType<typeof loadDriver>>;

// `Gallery` types every column as required because the runtime
// driver accepts the full insert tuple — but in practice SQLite
// fills missing columns with NULL / defaults, so tests benefit
// from passing just an id. This helper fills the rest with
// schema-friendly empty values to satisfy the type system.
export const mkGallery = (partial: Partial<Gallery> & { id: string }): Gallery => ({
  title: "",
  description: "",
  icon: "",
  epoch: "",
  epochType: "",
  theme: "",
  initialView: "",
  hostname: "",
  defaultLanguage: "en",
  ...partial,
});
