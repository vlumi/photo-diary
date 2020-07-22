import React from "react";
import { Redirect } from "react-router-dom";
import PropTypes from "prop-types";

import token from "../utils/token";

const Logout = ({ setUser }) => {
  const handleLogout = (event) => {
    event.preventDefault();
    window.localStorage.clear();
    setUser(undefined);
    token.clearToken();
  };

  return (
    <form onSubmit={handleLogout}>
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
