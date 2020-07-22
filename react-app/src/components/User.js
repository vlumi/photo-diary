import React from "react";
import PropTypes from "prop-types";

const renderUserInfo = (user) => {
  if (!user || !("id" in user)) {
    return <></>;
  }
  return <>{user.id}</>;
};

const User = ({ user }) => {
  return <span className="user">{renderUserInfo(user)}</span>;
};
User.propTypes = {
  user: PropTypes.object.isRequired,
};
export default User;
