import React from "react";
import PropTypes from "prop-types";

const AdminTop = ({ user }) => {
  if (!user || !user.isAdmin()) {
    return <>Access denied.</>;
  }
  return <>Adminz</>;
};
AdminTop.propTypes = {
  user: PropTypes.object,
};
export default AdminTop;
