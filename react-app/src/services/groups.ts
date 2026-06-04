import api, { unwrap } from "../lib/api";

export interface GroupRow {
  id: string;
  title: string;
  description: string;
}

export interface GroupCreateBody {
  id: string;
  title?: string;
  description?: string;
}

export interface GroupUpdatePatch {
  title?: string;
  description?: string;
}

const getAll = async (): Promise<GroupRow[]> =>
  unwrap(api.GET("/api/v1/groups", {})) as Promise<GroupRow[]>;

const get = async (groupId: string): Promise<GroupRow> =>
  unwrap(
    api.GET("/api/v1/groups/{groupId}", {
      params: { path: { groupId } },
    })
  ) as Promise<GroupRow>;

const create = async (body: GroupCreateBody): Promise<void> => {
  await unwrap(
    api.POST("/api/v1/groups", {
      body,
    })
  );
};

const update = async (
  groupId: string,
  patch: GroupUpdatePatch
): Promise<void> => {
  await unwrap(
    api.PUT("/api/v1/groups/{groupId}", {
      params: { path: { groupId } },
      body: patch,
    })
  );
};

// `remove` not `delete` — `delete` is a reserved word.
const remove = async (groupId: string): Promise<void> => {
  await unwrap(
    api.DELETE("/api/v1/groups/{groupId}", {
      params: { path: { groupId } },
    })
  );
};

const getMembers = async (groupId: string): Promise<string[]> =>
  unwrap(
    api.GET("/api/v1/groups/{groupId}/members", {
      params: { path: { groupId } },
    })
  ) as Promise<string[]>;

const addMember = async (groupId: string, userId: string): Promise<void> => {
  await unwrap(
    api.PUT("/api/v1/groups/{groupId}/members/{userId}", {
      params: { path: { groupId, userId } },
    })
  );
};

const removeMember = async (
  groupId: string,
  userId: string
): Promise<void> => {
  await unwrap(
    api.DELETE("/api/v1/groups/{groupId}/members/{userId}", {
      params: { path: { groupId, userId } },
    })
  );
};

export default {
  getAll,
  get,
  create,
  update,
  remove,
  getMembers,
  addMember,
  removeMember,
};
