import api, { unwrap } from "../lib/api";

export type EpochType = "birthday" | "1-index" | "0-index";
export type Theme =
  | "blue"
  | "red"
  | "grayscale"
  | "contrast"
  | "alert"
  | "dark"
  | "amoled"
  | "forest"
  | "silver"
  | "showcase"
  | "teal"
  | "paper"
  | "amber"
  | "lavender"
  | "sage"
  | "slate"
  | "midnight"
  | "espresso";
export type InitialView = "year" | "month" | "day" | "photo";

export interface GalleryUpdatePatch {
  title?: string;
  description?: string;
  titleLocalized?: Record<string, string>;
  descriptionLocalized?: Record<string, string>;
  defaultLanguage?: string;
  icon?: string;
  epoch?: string;
  epochType?: EpochType;
  theme?: Theme;
  initialView?: InitialView;
  hostname?: string;
  // Hybrid gallery sources (#22 / #568). Non-empty stamps the
  // gallery as `type='hybrid'`; an empty array reverts to `'real'`.
  // Each entry is a source gallery id; the model layer enforces
  // "must be a real gallery" and "no self-reference".
  sources?: string[];
}

export interface GalleryCreateBody extends GalleryUpdatePatch {
  id: string;
}

const getAll = async () => unwrap(api.GET("/api/v1/galleries", {}));

const get = async (galleryId: string) =>
  unwrap(
    api.GET("/api/v1/galleries/{galleryId}", {
      params: { path: { galleryId } },
    })
  );

const update = async (
  galleryId: string,
  patch: GalleryUpdatePatch
): Promise<void> => {
  await unwrap(
    api.PUT("/api/v1/galleries/{galleryId}", {
      params: { path: { galleryId } },
      body: patch,
    })
  );
};

const create = async (body: GalleryCreateBody): Promise<void> => {
  await unwrap(
    api.POST("/api/v1/galleries", {
      body,
    })
  );
};

// `remove` rather than `delete` — the latter is a reserved word so
// importers can't destructure it without renaming.
const remove = async (galleryId: string): Promise<void> => {
  await unwrap(
    api.DELETE("/api/v1/galleries/{galleryId}", {
      params: { path: { galleryId } },
    })
  );
};

export interface IconCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

const setIcon = async (
  galleryId: string,
  sourcePhotoId: string,
  crop: IconCrop,
  sourceName: string
): Promise<{ icon: string }> =>
  unwrap(
    api.PUT("/api/v1/galleries/{galleryId}/icon", {
      params: { path: { galleryId } },
      body: { sourcePhotoId, crop, sourceName },
    })
  ) as Promise<{ icon: string }>;

// Apply operator-curated gallery order (#585). `ids` must cover
// every current gallery exactly once — server rejects partial lists
// with 422 so callers don't accidentally strand untouched galleries
// at ordinal 0.
const reorder = async (ids: string[]): Promise<void> => {
  await unwrap(
    api.POST("/api/v1/galleries/_order", {
      body: { ids },
    })
  );
};

export default { getAll, get, update, create, remove, setIcon, reorder };
