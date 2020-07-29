import React from "react";
import PropTypes from "prop-types";

import token from "../lib/token";

const Logout = ({ setUser }) => {
  const handleLogout = (event) => {
    event.preventDefault();
    window.localStorage.clear();
    setUser(undefined);
    token.clearToken();
  };

  return (
    <form  className="logout" onSubmit={handleLogout}>
      <span className="logout">
        <button type="submit">Logout</button>
      </span>
    </form>
  );
};
Logout.propTypes = {
  setUser: PropTypes.func,
};
export default Logout;
