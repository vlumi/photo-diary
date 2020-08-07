import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import jwt from "jsonwebtoken";
import { useTranslation } from "react-i18next";

import TopMenuButton from "./TopMenuButton";

import UserModel from "../models/UserModel";

import tokenService from "../services/tokens";

import token from "../lib/token";

const Form = styled.form``;
const Input = styled.input`
  flex-grow: 1;
  max-width: 200px;
  width: 75px;
  height: 21px;
  border: 1px;
  margin: 0 2px;
  color: var(--header-background);
  background-color: var(--header-sub-color);
`;

const Login = ({ setUser }) => {
  const [userId, setUserId] = React.useState("");
  const [password, setPassword] = React.useState("");

  const { t } = useTranslation();

  const login = async (userId, password) => {
    try {
      const response = await tokenService.login(userId, password);
      const rawToken = response.data.token;
      const user = UserModel(jwt.decode(rawToken), rawToken);

      token.setToken(rawToken);
      window.localStorage.setItem("user", user.toJson());
      setUser(user);
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
    <Form onSubmit={handleLogin}>
      <Input
        type="text"
        value={userId}
        name="userId"
        placeholder="Username"
        onChange={({ target }) => setUserId(target.value)}
      />
      <Input
        type="password"
        value={password}
        name="password"
        placeholder="Password"
        onChange={({ target }) => setPassword(target.value)}
      />
      <TopMenuButton type="submit">{t("login")}</TopMenuButton>
    </Form>
  );
};
Login.propTypes = {
  setUser: PropTypes.func.isRequired,
};
export default Login;
