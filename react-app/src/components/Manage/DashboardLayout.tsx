import React from "react";
import { Outlet } from "react-router-dom";

import Dashboard from "./Dashboard";

// /m always renders the dashboard. Nested routes (notably /m/instance)
// mount through the Outlet as modals layered over the tile grid —
// Instance has no list of its own, so the dashboard serves as its
// "preserved context" (#606).
const DashboardLayout = (): React.ReactElement => (
  <>
    <Dashboard />
    <Outlet />
  </>
);

export default DashboardLayout;
