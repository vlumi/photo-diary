import React from "react";

import tokenService from "../services/tokens";

const renderUserInfo = () => {
  if (!tokenService.isLoggedIn()) {
    return <></>;
  }
  return <>{tokenService.id()}</>;
};

const User = () => {
  return <span className="user">{renderUserInfo()}</span>;
};

export default User;
