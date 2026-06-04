import api, { unwrap } from "../lib/api";

export interface UserRow {
  id: string;
  isAdmin: boolean;
}

export interface UserCreateBody {
  id: string;
  password: string;
  isAdmin?: boolean;
}

export interface UserUpdatePatch {
  password?: string;
  isAdmin?: boolean;
}

const getAll = async (): Promise<UserRow[]> =>
  unwrap(api.GET("/api/v1/users", {})) as Promise<UserRow[]>;

// The OpenAPI schema marks the GET /users/{userId} response body
// as `never` (it pre-dates the response-body typing pass), so the
// typed return collapses to `undefined`. Cast through `unknown`
// until the route gets a real response schema.
const get = async (userId: string): Promise<Record<string, unknown> & { id: string }> =>
  unwrap(
    api.GET("/api/v1/users/{userId}", {
      params: { path: { userId } },
    })
  ) as unknown as Promise<Record<string, unknown> & { id: string }>;

const create = async (body: UserCreateBody): Promise<void> => {
  await unwrap(
    api.POST("/api/v1/users", {
      body,
    })
  );
};

const update = async (
  userId: string,
  patch: UserUpdatePatch
): Promise<void> => {
  await unwrap(
    api.PUT("/api/v1/users/{userId}", {
      params: { path: { userId } },
      body: patch,
    })
  );
};

// `remove` not `delete` — `delete` is a reserved word so importers
// would have to rename on destructure.
const remove = async (userId: string): Promise<void> => {
  await unwrap(
    api.DELETE("/api/v1/users/{userId}", {
      params: { path: { userId } },
    })
  );
};

const changePassword = async (
  currentPassword: string,
  newPassword: string
) =>
  unwrap(
    api.PUT("/api/v1/users/self/password", {
      body: { currentPassword, newPassword },
    })
  );

export default { getAll, get, create, update, remove, changePassword };
