interface UserData {
  id: string | number;
  token?: string;
  refreshToken?: string;
  isAdmin?: boolean;
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
    };
  };

  const user = importUserData(userData, token, refreshToken);
  const self = {
    id: () => user.id,
    token: () => user.token,
    refreshToken: () => user.refreshToken,
    isAdmin: () => !!user.isAdmin,
    toJson: () => JSON.stringify(user),
  };
  return self;
};

export type User = ReturnType<typeof UserModel>;
export default UserModel;
