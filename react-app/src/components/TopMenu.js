import React from "react";
import PropTypes from "prop-types";

import Toggleable from "./Toggleable";
import Login from "./Login";
import Logout from "./Logout";
import User from "./User";

const TopMenu = ({ user, setUser }) => {
  const renderUserInfo = () => {
    return <User user={user} />;
  };
  const renderContent = () => {
    if (user) {
      return (
        <>
          <span>
            {renderUserInfo()}
            <Logout setUser={setUser} />
          </span>
        </>
      );
    }
    return (
      <Toggleable
        showLabel="Login"
        hideLabel="╳"
        defaultBody={renderUserInfo()}
      >
        <Login setUser={setUser} />
      </Toggleable>
    );
  };
  return <div className="top-menu">{renderContent()}</div>;
};
TopMenu.propTypes = {
  user: PropTypes.object,
  setUser: PropTypes.func,
};
export default TopMenu;
