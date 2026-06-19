interface UserData {
  id: string | number;
  isAdmin?: boolean;
  // Gallery ids the user is gallery-editor on (has `is_editor=1`
  // on `user_gallery` directly or via a group). Populated by the
  // tokens endpoint at login + refresh; purely a client-side
  // rendering hint — the server enforces every request.
  editorGalleries?: string[];
}

const UserModel = (userData: UserData | undefined) => {
  const importUserData = (
    userData: UserData | undefined
  ): UserData => {
    if (!userData || !("id" in userData) || !userData.id) {
      throw new Error("Invalid user");
    }
    return {
      id: userData.id,
      isAdmin: userData.isAdmin,
      editorGalleries: userData.editorGalleries ?? [],
    };
  };

  const user = importUserData(userData);
  const editorSet = new Set(user.editorGalleries ?? []);
  const self = {
    id: () => user.id,
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
