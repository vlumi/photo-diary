import React from "react";
import { Outlet } from "react-router-dom";

import Galleries from "./Galleries";

// Routed layout: the list always renders, the Outlet slot mounts
// item-edit / create modals on top via nested routes. Lets URLs like
// /m/g/<id> and /m/galleries/new render the modal layered over the
// list without unmounting it (per #606).
const GalleriesLayout = (): React.ReactElement => (
  <>
    <Galleries />
    <Outlet />
  </>
);

export default GalleriesLayout;
