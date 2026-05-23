import React from "react";
import styled from "@emotion/styled";
import * as jose from "jose";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import UserModel from "../models/UserModel";

import tokenService from "../services/tokens";

import { HttpError } from "../lib/api";
import token from "../lib/token";
import { useUserStore, useNotificationsStore } from "../stores";

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const Input = styled.input`
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  font-size: 1em;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  color: var(--primary-color);
  background-color: var(--primary-background);
`;
const SubmitButton = styled.button`
  padding: 8px 14px;
  font-size: 1em;
  font-weight: bold;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  color: var(--header-color);
  background: var(--header-background);
  cursor: pointer;
  &:hover {
    filter: brightness(1.15);
  }
`;
// Inline error pill rendered between the form and the submit button.
// Login lives inside a modal whose backdrop visually hides the toast
// strip, so wrong-credentials messages and the rate-limit hint go here
// instead of `notify()` — the toast surface stays for non-login errors.
const ErrorMessage = styled.div`
  padding: 8px 12px;
  border: 1px solid #a02020;
  background: #7a1a1a;
  color: #fee;
  border-radius: 4px;
  font-size: 0.9em;
`;

interface Props {
  // Modal wrapper closes itself on successful login.
  onSuccess?: () => void;
  autoFocus?: boolean;
}

const Login = ({ onSuccess, autoFocus = true }: Props): React.ReactElement => {
  const [userId, setUserId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | undefined>(undefined);

  const { t } = useTranslation();
  const setUser = useUserStore((s) => s.setUser);
  const notify = useNotificationsStore((s) => s.notify);
  const queryClient = useQueryClient();

  const login = async (userId: string, password: string) => {
    try {
      const data = await tokenService.login(userId, password);
      const rawToken = data.token;
      // We trust the just-issued token (the server signed it; we got it
      // back from the response body). `decodeJwt` parses the claims
      // without verifying the signature — verification happens server-
      // side on every subsequent request via `verifyToken`. Using jose's
      // decoder instead of the hand-rolled base64-then-JSON dance keeps
      // the JWT handling consistent with the rest of the codebase.
      const userData = jose.decodeJwt(rawToken) as unknown as {
        id: string;
        isAdmin?: boolean;
      };
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
      setError(undefined);
      onSuccess?.();
      // Success toast fires after the modal closes (onSuccess closes it),
      // so the user sees it on the now-uncovered backdrop. The toast
      // surface is the right fit here — there's no longer a form to
      // attach an inline confirmation to.
      notify("success", t("login-success", { userId: user.id() }));
    } catch (err) {
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
      if (err instanceof HttpError && err.response.status === 429) {
        setError(t("login-rate-limited"));
      } else {
        setError(t("login-failed"));
      }
    }
  };

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    login(userId, password);
    setPassword("");
  };

  return (
    <Form onSubmit={handleLogin}>
      <Input
        type="text"
        value={userId}
        name="userId"
        autoComplete="username"
        placeholder={t("login-username")}
        autoFocus={autoFocus}
        onChange={({ target }) => setUserId(target.value)}
      />
      <Input
        type="password"
        value={password}
        name="password"
        autoComplete="current-password"
        placeholder={t("login-password")}
        onChange={({ target }) => setPassword(target.value)}
      />
      {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
      <SubmitButton type="submit">{t("login")}</SubmitButton>
    </Form>
  );
};
export default Login;
