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
  | "paper";
export type InitialView = "year" | "month" | "day" | "photo";

export interface GalleryUpdatePatch {
  title?: string;
  description?: string;
  icon?: string;
  epoch?: string;
  epochType?: EpochType;
  theme?: Theme;
  initialView?: InitialView;
  hostname?: string;
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

export default { getAll, get, update, create, remove };
