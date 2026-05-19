interface UserData {
  id: string;
  token?: string;
  isAdmin?: boolean;
}

const UserModel = (userData: UserData, token?: string) => {
  const importUserData = (userData: UserData, token?: string): UserData => {
    if (!userData || !("id" in userData) || !userData.id) {
      throw new Error("Invalid user");
    }
    return {
      id: userData.id,
      token: token || userData.token,
      isAdmin: userData.isAdmin,
    };
  };

  const user = importUserData(userData, token);
  const self = {
    id: () => user.id,
    token: () => user.token,
    isAdmin: () => !!user.isAdmin,
    toJson: () => JSON.stringify(user),
  };
  return self;
};

export type User = ReturnType<typeof UserModel>;
export default UserModel;
