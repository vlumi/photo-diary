import React from "react";
import PropTypes from "prop-types";

import jwt from "jsonwebtoken";

import tokenService from "../services/tokens";

import token from "../utils/token";

const Login = ({ setUser }) => {
  const [userId, setUserId] = React.useState("");
  const [password, setPassword] = React.useState("");

  const login = async (userId, password) => {
    try {
      const response = await tokenService.login(userId, password);
      const rawToken = response.data.token;
      const user = jwt.decode(rawToken);
      const userWithToken = { ...user, token: rawToken };

      token.setToken(rawToken);
      window.localStorage.setItem("user", JSON.stringify(userWithToken));
      setUser(userWithToken);
    } catch (error) {
      token.clearToken();
      window.localStorage.clear();
      setUser(undefined);
      // TODO: notify user
    }
  };

  const handleLogin = (event) => {
    event.preventDefault();
    login(userId, password);
    setPassword("");
  };

  return (
    <>
      <form onSubmit={handleLogin}>
        <span className="login">
          <input
            type="text"
            value={userId}
            name="userId"
            placeholder="Username"
            onChange={({ target }) => setUserId(target.value)}
          />
          <input
            type="password"
            value={password}
            name="password"
            placeholder="Password"
            onChange={({ target }) => setPassword(target.value)}
          />
          <button type="submit">Login</button>
        </span>
      </form>
    </>
  );
};
Login.propTypes = {
  setUser: PropTypes.func,
};
export default Login;
