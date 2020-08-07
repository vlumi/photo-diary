import React from "react";
import PropTypes from "prop-types";

const Admin = ({ children, user }) => {
  if (!user || !user.isAdmin()) {
    return (
      <>
        {children}
        Access denied.
      </>
    );
  }
  // TODO: split by sections..?
  //  - manage gallery AdminGallery
  //    - import
  //    - update/delete/link/unlink
  //  - manage users AdminUser
  //    - create/update/delete
  //    - acl

  return <>{children} Adminz</>;
};
Admin.propTypes = {
  children: PropTypes.any.isRequired,
  user: PropTypes.object,
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number,
  month: PropTypes.number,
  day: PropTypes.number,
  photo: PropTypes.object,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Admin;
