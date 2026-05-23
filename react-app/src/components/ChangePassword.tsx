import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import usersService from "../services/users";

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
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
const ErrorMessage = styled.div`
  padding: 8px 12px;
  border: 1px solid #a02020;
  background: #7a1a1a;
  color: #fee;
  border-radius: 4px;
  font-size: 0.9em;
`;

interface Props {
  onSuccess?: () => void;
}

const ChangePassword = ({ onSuccess }: Props): React.ReactElement => {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = React.useState(false);

  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const notify = useNotificationsStore((s) => s.notify);

  const submit = async () => {
    if (!user) return;
    if (next !== confirm) {
      setError(t("change-password-mismatch"));
      return;
    }
    setSubmitting(true);
    try {
      const { token: newToken } = await usersService.changePassword(
        current,
        next
      );
      // Swap in the new JWT so subsequent requests stay authenticated under
      // the rotated secret. localStorage's `user` blob holds the token too,
      // so refresh it from the same `UserModel` round-trip the login path
      // uses — but we don't have the new user payload from the server, so
      // re-wrap the existing user with the new raw token. The id / isAdmin
      // bits don't change on a password rotation.
      token.setToken(newToken);
      const stored = window.localStorage.getItem("user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.token = newToken;
          window.localStorage.setItem("user", JSON.stringify(parsed));
        } catch {
          // Corrupt localStorage — nothing we can do here; the next
          // 401 handler will catch any downstream issue.
        }
      }
      setError(undefined);
      onSuccess?.();
      notify("success", t("change-password-success"));
    } catch (err) {
      // 422 = the server says the body is wrong (we only send the wrong-
      // current case from this form), distinct from a 401 which would
      // mean the session itself stopped working. The latter is handled
      // by the global handler in `lib/api.ts`.
      if (err instanceof HttpError && err.response.status === 422) {
        setError(t("change-password-wrong-current"));
      } else {
        setError(t("change-password-failed"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    submit();
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Input
        type="password"
        value={current}
        name="currentPassword"
        autoComplete="current-password"
        placeholder={t("change-password-current")}
        autoFocus
        onChange={({ target }) => setCurrent(target.value)}
      />
      <Input
        type="password"
        value={next}
        name="newPassword"
        autoComplete="new-password"
        placeholder={t("change-password-new")}
        onChange={({ target }) => setNext(target.value)}
      />
      <Input
        type="password"
        value={confirm}
        name="confirmPassword"
        autoComplete="new-password"
        placeholder={t("change-password-confirm")}
        onChange={({ target }) => setConfirm(target.value)}
      />
      {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
      <SubmitButton type="submit" disabled={submitting || !current || !next}>
        {t("change-password-submit")}
      </SubmitButton>
    </Form>
  );
};
export default ChangePassword;
