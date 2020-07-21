import React from "react";

import Toggleable from "./Toggleable";
import Login from "./Login";
import User from "./User";

const GalleryTopMenu = () => {
  return (
    <div className="top-menu">
      <User />
      <Toggleable showLabel="Login" hideLabel="X">
        <Login />
      </Toggleable>
    </div>
  );
};

export default GalleryTopMenu;
