import api, { unwrap } from "../lib/api";
import type { paths } from "../lib/api-schema";

const KNOWN_KEYS = [
  "name",
  "description",
  "cdn",
  "image",
  "defaultGallery",
  "defaultTheme",
  "defaultLanguage",
  "initialGalleryView",
  "firstWeekday",
  "betaFeatures",
  "renditions",
  "knownHosts",
] as const satisfies readonly KnownMetaKey[];

// The keys the server lets an admin write, from its own schema. The
// list above exists because the settings page needs them at run time;
// the two checks keep it equal to the type, in both directions.
export type KnownMetaKey =
  paths["/api/v1/meta/{key}"]["put"]["parameters"]["path"]["key"];
type Unlisted = Exclude<KnownMetaKey, (typeof KNOWN_KEYS)[number]>;
const everyKeyIsListed: [Unlisted] extends [never] ? true : Unlisted = true;
void everyKeyIsListed;

const getAll = async () => unwrap(api.GET("/api/v1/meta", {}));

// Upsert a meta value. PUT is an upsert on the server (RFC 7231
// §4.3.4) — a single request handles both first-time create and
// in-place update.
const set = async (key: KnownMetaKey, value: string): Promise<void> => {
  await unwrap(
    api.PUT("/api/v1/meta/{key}", {
      params: { path: { key } },
      body: { value },
    })
  );
};

const remove = async (key: KnownMetaKey): Promise<void> => {
  await unwrap(
    api.DELETE("/api/v1/meta/{key}", {
      params: { path: { key } },
    })
  );
};

export default { getAll, set, remove, KNOWN_KEYS };
