import api, { unwrap } from "../lib/api";

export interface UserGalleryRow {
  user_id: string;
  gallery_id: string;
  is_editor: number;
  hide_map: number | null;
  can_see_private: number;
}

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
  ) as Promise<UserGalleryRow[]>;
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
