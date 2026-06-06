import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import usersService, { type UserCreateBody } from "../../services/users";

const Root = styled.div`
  padding: 24px 16px;
  max-width: 640px;
  margin: 0 auto;
  text-align: left;
`;
const Title = styled.h2`
  margin: 0 0 16px;
  font-size: 1.2em;
`;
const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
`;
const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
const FieldLabel = styled.span`
  font-size: 0.8em;
  color: var(--inactive-color);
`;
const FieldHint = styled.span`
  font-size: 0.75em;
  color: var(--inactive-color);
  font-style: italic;
`;
const Input = styled.input<{ $invalid?: boolean }>`
  font: inherit;
  padding: 6px 8px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid
    ${({ $invalid }) => ($invalid ? "#c33" : "var(--inactive-color)")};
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
`;
const Checkbox = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
`;
const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
`;
const ButtonPrimary = styled.button`
  font: inherit;
  padding: 6px 14px;
  background: var(--header-background);
  color: var(--header-color);
  border: 1px solid var(--header-background);
  border-radius: 4px;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
const ButtonSecondary = styled.button`
  font: inherit;
  padding: 6px 14px;
  background: transparent;
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  cursor: pointer;
`;
const ErrorBanner = styled.div`
  padding: 8px 12px;
  margin-bottom: 16px;
  background: rgba(220, 60, 60, 0.15);
  color: var(--primary-color);
  border-radius: 4px;
  font-size: 0.85em;
`;

// Mirrors the server's id constraint: minLength 1, must not start
// with ":" (reserved for pseudo-users like :guest).
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

const UserCreate = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [id, setId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [adminFlag, setAdminFlag] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const idValid = id.length > 0 && ID_PATTERN.test(id);
  const passwordValid = password.length > 0;
  const formValid = idValid && passwordValid;
  const idTouched = id.length > 0;

  const createMutation = useMutation({
    mutationFn: (body: UserCreateBody) => usersService.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-users"] });
      navigate(`/m/users/${id}`);
    },
    onError: (err: Error) => {
      setSaveError(err.message);
    },
  });

  const handleSave = (): void => {
    if (!formValid) return;
    setSaveError(null);
    createMutation.mutate({ id, password, isAdmin: adminFlag || undefined });
  };
  const handleCancel = (): void => {
    navigate("/m/users");
  };

  return (
    <Root>
      <Title>{t("manage-user-create-title")}</Title>
      {saveError && (
        <ErrorBanner>
          {t("manage-user-create-error")}
          {": "}
          {saveError}
        </ErrorBanner>
      )}
      <Section>
        <Field>
          <FieldLabel>{t("manage-users-col-id")}</FieldLabel>
          <Input
            value={id}
            onChange={(e) => setId(e.target.value)}
            $invalid={idTouched && !idValid}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <FieldHint>{t("manage-user-field-id-hint")}</FieldHint>
        </Field>
        <Field>
          <FieldLabel>{t("manage-user-field-password")}</FieldLabel>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Checkbox>
          <input
            type="checkbox"
            checked={adminFlag}
            onChange={(e) => setAdminFlag(e.target.checked)}
          />
          <span>{t("manage-user-field-is-admin")}</span>
        </Checkbox>
      </Section>
      <Footer>
        <ButtonSecondary type="button" onClick={handleCancel}>
          {t("manage-user-button-cancel")}
        </ButtonSecondary>
        <ButtonPrimary
          type="button"
          onClick={handleSave}
          disabled={!formValid || createMutation.isPending}
        >
          {createMutation.isPending
            ? t("manage-user-button-creating")
            : t("manage-user-button-create")}
        </ButtonPrimary>
      </Footer>
    </Root>
  );
};

export default UserCreate;
