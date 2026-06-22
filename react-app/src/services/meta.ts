import api, { unwrap } from "../lib/api";

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
] as const;
export type KnownMetaKey = (typeof KNOWN_KEYS)[number];

const getAll = async () => unwrap(api.GET("/api/v1/meta", {}));

// Upsert a meta value. Tries PUT first (in-place update); on 404
// (key doesn't yet exist) falls back to POST. The two routes
// share an authorization gate, so callers don't have to know
// which one fits — the result is the same persistent row.
const set = async (key: KnownMetaKey, value: string): Promise<void> => {
  try {
    await unwrap(
      api.PUT("/api/v1/meta/{key}", {
        params: { path: { key } },
        body: { value },
      })
    );
  } catch (err) {
    const status = (err as { status?: number } | undefined)?.status;
    if (status === 404) {
      await unwrap(
        api.POST("/api/v1/meta", {
          body: { key, value },
        })
      );
      return;
    }
    throw err;
  }
};

const remove = async (key: KnownMetaKey): Promise<void> => {
  await unwrap(
    api.DELETE("/api/v1/meta/{key}", {
      params: { path: { key } },
    })
  );
};

export default { getAll, set, remove, KNOWN_KEYS };
