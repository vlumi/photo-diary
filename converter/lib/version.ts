import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Read the converter workspace's package.json — `import.meta.dirname`
// resolves to this file's directory, so step up to the workspace root.
const here = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(here, "..", "package.json");

let cached: string | undefined;
export const readPackageVersion = (): string => {
  if (cached) return cached;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
    version?: string;
  };
  cached = pkg.version ?? "0.0.0";
  return cached;
};
