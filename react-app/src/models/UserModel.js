const UserModel = (userData, token) => {
  const importUserData = (userData, token) => {
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

export default UserModel;
