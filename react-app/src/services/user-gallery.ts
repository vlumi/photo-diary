import api, { unwrap } from "../lib/api";
import type { ResponseOf } from "../lib/api-types";

export type UserGalleryRow = ResponseOf<"/api/v1/user-gallery", "get">[number];

export interface UserGalleryUpsertBody {
  isEditor: boolean;
  hideMap?: boolean | null;
  canSeePrivate?: boolean;
}

const list = async (filter: {
  userId?: string;
  galleryId?: string;
} = {}): Promise<UserGalleryRow[]> => {
  const query: Record<string, string> = {};
  if (filter.userId) query.userId = filter.userId;
  if (filter.galleryId) query.galleryId = filter.galleryId;
  return unwrap(
    api.GET("/api/v1/user-gallery", {
      params: { query },
    })
  );
};

const upsert = async (
  userId: string,
  galleryId: string,
  body: UserGalleryUpsertBody
): Promise<void> => {
  await unwrap(
    api.PUT("/api/v1/user-gallery/{userId}/{galleryId}", {
      params: { path: { userId, galleryId } },
      body,
    })
  );
};

const remove = async (
  userId: string,
  galleryId: string
): Promise<void> => {
  await unwrap(
    api.DELETE("/api/v1/user-gallery/{userId}/{galleryId}", {
      params: { path: { userId, galleryId } },
    })
  );
};

export default { list, upsert, remove };
