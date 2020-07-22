import React from "react";
import PropTypes from "prop-types";

const AdminTop = ({ user }) => {
  if (!user || !user.isAdmin()) {
    return <>Access denied.</>;
  }
  // TODO: split by sections..?
  //  - manage gallery AdminGallery
  //    - import
  //    - update/delete/link/unlink
  //  - manage users AdminUser
  //    - create/update/delete
  //    - acl

  return <>Adminz</>;
};
AdminTop.propTypes = {
  user: PropTypes.object,
};
export default AdminTop;
