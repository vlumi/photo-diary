import React from "react";
import PropTypes from "prop-types";

import tokenService from "../services/tokens";

const Login = () => {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  // const [user, setUser] = React.useState(undefined);

  const login = async (username, password) => {
    try {
      const user = await tokenService.login({ username, password });

      window.localStorage.setItem("user", JSON.stringify(user));
      // blogService.setToken(user.setToken);
      // setUser(user);
      // showMessage(`Login successful. Welcome ${user.username}!`);
      return true;
    } catch (error) {
      // blogService.setToken(undefined);
      // setUser(undefined);
      // showErrorMessage("Invalid credentials");
      return false;
    }
  };

  const handleLogin = (event) => {
    event.preventDefault();
    login(username, password);
    setPassword("");
  };

  return (
    <>
      <span className="login">
        <form onSubmit={handleLogin}>
          <input
            type="text"
            value={username}
            name="username"
            placeholder="Username"
            onChange={({ target }) => setUsername(target.value)}
          />
          <input
            type="password"
            value={password}
            name="password"
            placeholder="Password"
            onChange={({ target }) => setPassword(target.value)}
          />
          <button type="submit">Login</button>
        </form>
      </span>
    </>
  );
};
Login.propTypes = {
  login: PropTypes.func.isRequired,
};
export default Login;
