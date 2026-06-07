interface UserData {
  id: string | number;
  token?: string;
  refreshToken?: string;
  isAdmin?: boolean;
  // Gallery ids the user is gallery-editor on (has `is_admin=1`
  // on `user_gallery` directly or via a group). Populated by the
  // tokens endpoint at login + refresh; purely a client-side
  // rendering hint — the server enforces every request.
  editorGalleries?: string[];
}

const UserModel = (
  userData: UserData | undefined,
  token?: string,
  refreshToken?: string
) => {
  const importUserData = (
    userData: UserData | undefined,
    token?: string,
    refreshToken?: string
  ): UserData => {
    if (!userData || !("id" in userData) || !userData.id) {
      throw new Error("Invalid user");
    }
    return {
      id: userData.id,
      token: token || userData.token,
      refreshToken: refreshToken || userData.refreshToken,
      isAdmin: userData.isAdmin,
      editorGalleries: userData.editorGalleries ?? [],
    };
  };

  const user = importUserData(userData, token, refreshToken);
  const editorSet = new Set(user.editorGalleries ?? []);
  const self = {
    id: () => user.id,
    token: () => user.token,
    refreshToken: () => user.refreshToken,
    isAdmin: () => !!user.isAdmin,
    // Global admin satisfies editor on every gallery (the server
    // does the same short-circuit in `authorizeGalleryEditor`).
    isGalleryEditor: (galleryId: string) =>
      !!user.isAdmin || editorSet.has(galleryId),
    editorGalleries: () => user.editorGalleries ?? [],
    toJson: () => JSON.stringify(user),
  };
  return self;
};

export type User = ReturnType<typeof UserModel>;
export default UserModel;
