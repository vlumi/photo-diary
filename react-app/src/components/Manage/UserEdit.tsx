import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BsPencilSquare, BsTrash } from "react-icons/bs";

import ItemModal from "./ItemModal";
import { Section } from "./Section";
import usersService, { type UserUpdatePatch } from "../../services/users";
import { useUserStore } from "../../stores";

const Root = styled.div`
  padding: 24px 16px;
  max-width: 640px;
  margin: 0 auto;
  text-align: left;
`;
const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin: 0 0 16px;
`;
const Title = styled.h2`
  margin: 0;
  font-size: 1.2em;
`;
const Notice = styled.p`
  color: var(--inactive-color);
  font-style: italic;
  margin: 0;
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
const Input = styled.input`
  font: inherit;
  padding: 6px 8px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
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
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
`;
const FooterRight = styled.div`
  display: inline-flex;
  gap: 8px;
`;
const ButtonPrimary = styled.button`
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
const ButtonDanger = styled.button`
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: transparent;
  color: #c33;
  border: 1px solid #c33;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: rgba(204, 51, 51, 0.1);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
const InfoBanner = styled.div`
  padding: 8px 12px;
  margin-bottom: 16px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  font-size: 0.85em;
`;
const ErrorBanner = styled.div`
  padding: 8px 12px;
  margin-bottom: 16px;
  background: rgba(220, 60, 60, 0.15);
  color: var(--primary-color);
  border-radius: 4px;
  font-size: 0.85em;
`;
const ConfirmPanel = styled.div`
  padding: 12px 16px;
  margin-top: 20px;
  background: rgba(220, 60, 60, 0.1);
  border: 1px solid #c33;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
const ConfirmHeading = styled.div`
  font-weight: bold;
  color: #c33;
`;
const ConfirmBody = styled.p`
  margin: 0;
  font-size: 0.9em;
`;
const ConfirmActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;
const Summary = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 16px;
  row-gap: 8px;
  margin: 0;
`;
const SummaryLabel = styled.dt`
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--inactive-color);
  padding-top: 2px;
  white-space: nowrap;
`;
const SummaryValue = styled.dd`
  margin: 0;
  word-break: break-word;
  min-width: 0;
`;
const Mono = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
`;

interface UserData {
  id: string;
  name?: string;
  is_admin?: number | boolean;
  isAdmin?: boolean;
}

const isAdminFlag = (data: UserData | undefined): boolean => {
  if (!data) return false;
  if (typeof data.isAdmin === "boolean") return data.isAdmin;
  return !!data.is_admin;
};

const UserEdit = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const userId = params.userId as string;
  const user = useUserStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["manage-user", userId, user?.id ?? null],
    queryFn: () => usersService.get(userId),
    enabled: !!userId && !!user?.isAdmin(),
  });

  const [name, setName] = React.useState("");
  const [adminFlag, setAdminFlag] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  React.useEffect(() => {
    if (data) {
      setName(((data as UserData).name as string) ?? "");
      setAdminFlag(isAdminFlag(data as UserData));
      setNewPassword("");
      setSaveError(null);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const original = isAdminFlag(data as UserData | undefined);
      const originalName = ((data as UserData | undefined)?.name ?? "") as string;
      const patch: UserUpdatePatch = {};
      if (name !== originalName) patch.name = name;
      if (adminFlag !== original) patch.isAdmin = adminFlag;
      if (newPassword.length > 0) patch.password = newPassword;
      return usersService.update(userId, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-user", userId] });
      queryClient.invalidateQueries({ queryKey: ["manage-users"] });
      setEditing(false);
      setNewPassword("");
    },
    onError: (err: Error) => {
      setSaveError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersService.remove(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-users"] });
      navigate("/m/users");
    },
    onError: (err: Error) => {
      setSaveError(err.message);
      setConfirmingDelete(false);
    },
  });

  const handleSave = (): void => {
    setSaveError(null);
    updateMutation.mutate();
  };
  const handleStartEdit = (): void => {
    setSaveError(null);
    setEditing(true);
  };
  const handleCancelEdit = (): void => {
    setName(((data as UserData | undefined)?.name ?? "") as string);
    setAdminFlag(isAdminFlag(data as UserData | undefined));
    setNewPassword("");
    setSaveError(null);
    setEditing(false);
  };

  if (isLoading)
    return (
      <ItemModal closeTo="/m/users">
        {() => (
          <Root>
            <Notice>{t("loading")}</Notice>
          </Root>
        )}
      </ItemModal>
    );
  if (isError || !data) {
    return (
      <ItemModal closeTo="/m/users">
        {() => (
          <Root>
            <Notice>{t("manage-user-load-error")}</Notice>
          </Root>
        )}
      </ItemModal>
    );
  }

  const flag = isAdminFlag(data as UserData);
  const isSelf = user?.id() === userId;
  // `:`-prefixed ids are reserved for pseudo-users (`:guest` for
  // now). They aren't real accounts — no login, no password, no
  // admin promotion makes sense — so the Edit + Delete affordances
  // are suppressed and only the read-only summary + the banner
  // remain. The id pattern is enforced server-side at create time.
  const isPseudo = userId.startsWith(":");

  const originalName = ((data as UserData).name ?? "") as string;
  const originalAdmin = isAdminFlag(data as UserData);
  const formDirty =
    name !== originalName ||
    adminFlag !== originalAdmin ||
    newPassword.length > 0;

  const handleEscape = (): boolean => {
    if (!editing) return false;
    if (formDirty) {
      const ok = window.confirm(String(t("manage-modal-confirm-discard")));
      if (!ok) return true;
    }
    handleCancelEdit();
    return true;
  };

  return (
    <ItemModal
      closeTo="/m/users"
      dirty={editing && formDirty}
      onEscape={handleEscape}
    >
      {() => (
        <Root>
          <TitleRow>
            <Title>
              <Mono>{userId}</Mono>
            </Title>
      </TitleRow>
      {isPseudo && (
        <InfoBanner>{t("manage-user-guest-banner")}</InfoBanner>
      )}
      {saveError && (
        <ErrorBanner>
          {t("manage-user-save-error")}
          {": "}
          {saveError}
        </ErrorBanner>
      )}

      {editing ? (
        <>
          <Section>
            {!isPseudo && (
              <Field>
                <FieldLabel>{t("manage-user-field-name")}</FieldLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <FieldHint>{t("manage-user-field-name-hint")}</FieldHint>
              </Field>
            )}
            <Field>
              <FieldLabel>{t("manage-user-field-password")}</FieldLabel>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <FieldHint>
                {isSelf
                  ? t("manage-user-field-password-self-hint")
                  : t("manage-user-field-password-hint")}
              </FieldHint>
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
            <span />
            <FooterRight>
              <ButtonSecondary
                type="button"
                onClick={handleCancelEdit}
                disabled={updateMutation.isPending}
              >
                {t("manage-user-button-cancel")}
              </ButtonSecondary>
              <ButtonPrimary
                type="button"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending
                  ? t("manage-user-button-saving")
                  : t("manage-user-button-save")}
              </ButtonPrimary>
            </FooterRight>
          </Footer>
        </>
      ) : (
        <>
          <Section>
            <Summary>
              <SummaryLabel>{t("manage-users-col-id")}</SummaryLabel>
              <SummaryValue>
                <Mono>{userId}</Mono>
              </SummaryValue>
              <SummaryLabel>{t("manage-user-field-name")}</SummaryLabel>
              <SummaryValue>
                {((data as UserData).name as string) || ""}
              </SummaryValue>
              <SummaryLabel>{t("manage-user-field-is-admin")}</SummaryLabel>
              <SummaryValue>
                {flag ? t("manage-user-flag-yes") : t("manage-user-flag-no")}
              </SummaryValue>
            </Summary>
          </Section>
          {!isPseudo && (
            <Footer>
              <ButtonDanger
                type="button"
                onClick={() => {
                  setSaveError(null);
                  setConfirmingDelete(true);
                }}
                disabled={deleteMutation.isPending || confirmingDelete}
              >
                <BsTrash aria-hidden />
                {t("manage-user-button-delete")}
              </ButtonDanger>
              <FooterRight>
                <ButtonPrimary type="button" onClick={handleStartEdit}>
                  <BsPencilSquare aria-hidden />
                  {t("manage-user-button-edit")}
                </ButtonPrimary>
              </FooterRight>
            </Footer>
          )}
        </>
      )}

      {confirmingDelete && (
        <ConfirmPanel role="alertdialog" aria-labelledby="delete-confirm-heading">
          <ConfirmHeading id="delete-confirm-heading">
            {t("manage-user-delete-heading", { id: userId })}
          </ConfirmHeading>
          <ConfirmBody>
            {isSelf
              ? t("manage-user-delete-body-self")
              : t("manage-user-delete-body")}
          </ConfirmBody>
          <ConfirmActions>
            <ButtonSecondary
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleteMutation.isPending}
            >
              {t("manage-user-button-cancel")}
            </ButtonSecondary>
            <ButtonDanger
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <BsTrash aria-hidden />
              {deleteMutation.isPending
                ? t("manage-user-button-deleting")
                : t("manage-user-button-confirm-delete")}
            </ButtonDanger>
          </ConfirmActions>
        </ConfirmPanel>
      )}
        </Root>
      )}
    </ItemModal>
  );
};

export default UserEdit;
