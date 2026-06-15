import React from "react";
import { Outlet } from "react-router-dom";

import Users from "./Users";

const UsersLayout = (): React.ReactElement => (
  <>
    <Users />
    <Outlet />
  </>
);

export default UsersLayout;
