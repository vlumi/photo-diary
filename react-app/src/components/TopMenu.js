import React from "react";

import Toggleable from "./Toggleable";
import Login from "./Login";
import User from "./User";

const TopMenu = () => {
  const renderUserInfo = () => {
    return <User />;
  };
  return (
    <div className="top-menu">
      <Toggleable
        showLabel="Login"
        hideLabel="╳"
        defaultBody={renderUserInfo()}
      >
        <Login />
      </Toggleable>
    </div>
  );
};

export default TopMenu;
