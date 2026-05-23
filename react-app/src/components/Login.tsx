import React from "react";
import styled from "@emotion/styled";
import * as jose from "jose";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import TopMenuButton from "./TopMenuButton";

import UserModel from "../models/UserModel";

import tokenService from "../services/tokens";

import { HttpError } from "../lib/api";
import token from "../lib/token";
import { useUserStore, useNotificationsStore } from "../stores";

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

const Login = (): React.ReactElement => {
  const [userId, setUserId] = React.useState("");
  const [password, setPassword] = React.useState("");

  const { t } = useTranslation();
  const setUser = useUserStore((s) => s.setUser);
  const notify = useNotificationsStore((s) => s.notify);
  const queryClient = useQueryClient();

  const login = async (userId: string, password: string) => {
    try {
      const data = await tokenService.login(userId, password);
      const rawToken = data.token;
      // TODO: sign/verify
      const userData = JSON.parse(
        new TextDecoder().decode(jose.base64url.decode(rawToken.split(".")[1]))
      );
      const user = UserModel(userData, rawToken);

      token.setToken(rawToken);
      window.localStorage.setItem("user", user.toJson());
      setUser(user);
      // Drop any access-derived data we cached under the previous (guest or
      // other-user) key. Without this, toggling auth state inside the
      // `staleTime` window leaves the SPA showing the previous identity's
      // view of `/galleries` and `/gallery-photos`.
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
    } catch (error) {
      token.clearToken();
      // Only the `user` key is auth state — the `lang` preference and
      // anything else live alongside but aren't tied to login, so the
      // previous `localStorage.clear()` here was a privacy/UX overreach.
      window.localStorage.removeItem("user");
      setUser(undefined);
      // 429 is the only failure mode whose specific cause is useful to
      // surface — `Too many failed attempts` is actionable (wait + try
      // later), and the rate-limit branch was already public on the
      // unauthenticated endpoint anyway. Everything else (bad creds,
      // user not found, network blip) gets the vague `Invalid username
      // or password` so the response doesn't help an attacker
      // distinguish "bad password for real user" from "unknown user".
      if (error instanceof HttpError && error.response.status === 429) {
        notify("warning", t("login-rate-limited"));
      } else {
        notify("error", t("login-failed"));
      }
    }
  };

  const handleLogin = (event: React.FormEvent) => {
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
export default Login;
