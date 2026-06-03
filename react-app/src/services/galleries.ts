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

export default { getAll, get, update };
