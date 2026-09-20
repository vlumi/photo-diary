import api, { unwrap } from "../lib/api";

export interface GroupGalleryRow {
  groupId: string;
  galleryId: string;
  isEditor: boolean;
  hideMap: boolean | null;
  canSeePrivate: boolean;
}

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
  ) as Promise<GroupGalleryRow[]>;
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
