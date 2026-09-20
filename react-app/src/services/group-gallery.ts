import api, { unwrap } from "../lib/api";
import type { ResponseOf } from "../lib/api-types";

export type GroupGalleryRow = ResponseOf<"/api/v1/group-gallery", "get">[number];

export interface GroupGalleryUpsertBody {
  isEditor: boolean;
  hideMap?: boolean | null;
  canSeePrivate?: boolean;
}

const list = async (filter: {
  groupId?: string;
  galleryId?: string;
} = {}): Promise<GroupGalleryRow[]> => {
  const query: Record<string, string> = {};
  if (filter.groupId) query.groupId = filter.groupId;
  if (filter.galleryId) query.galleryId = filter.galleryId;
  return unwrap(
    api.GET("/api/v1/group-gallery", {
      params: { query },
    })
  );
};

const upsert = async (
  groupId: string,
  galleryId: string,
  body: GroupGalleryUpsertBody
): Promise<void> => {
  await unwrap(
    api.PUT("/api/v1/group-gallery/{groupId}/{galleryId}", {
      params: { path: { groupId, galleryId } },
      body,
    })
  );
};

const remove = async (
  groupId: string,
  galleryId: string
): Promise<void> => {
  await unwrap(
    api.DELETE("/api/v1/group-gallery/{groupId}/{galleryId}", {
      params: { path: { groupId, galleryId } },
    })
  );
};

export default { list, upsert, remove };
