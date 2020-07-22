const User = (userData, token) => {
  const importGalleryData = (userData, token) => {
    return {
      id: userData.id,
      token: token || userData.token,
      isAdmin: userData.isAdmin,
    };
  };

  const user = importGalleryData(userData, token);
  const self = {
    id: () => user.id,
    token: () => user.token,
    isAdmin: () => user.isAdmin,
    toJson: () => JSON.stringify(user),
  };
  return self;
};

export default User;
