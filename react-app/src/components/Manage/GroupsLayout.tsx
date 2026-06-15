import React from "react";
import { Outlet } from "react-router-dom";

import Groups from "./Groups";

const GroupsLayout = (): React.ReactElement => (
  <>
    <Groups />
    <Outlet />
  </>
);

export default GroupsLayout;
