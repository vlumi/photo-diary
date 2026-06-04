import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BsPencilSquare, BsPlus, BsTrash, BsXLg } from "react-icons/bs";

import groupsService, {
  type GroupRow,
  type GroupUpdatePatch,
} from "../../services/groups";
import usersService, { type UserRow } from "../../services/users";
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
const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
`;
const SectionTitle = styled.h3`
  margin: 0 0 4px;
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--inactive-color);
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
const TextArea = styled.textarea`
  font: inherit;
  padding: 6px 8px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  width: 100%;
  min-height: 60px;
  box-sizing: border-box;
  resize: vertical;
`;
const Select = styled.select`
  font: inherit;
  padding: 6px 8px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  flex: 1 1 auto;
  min-width: 0;
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
const SummaryEmpty = styled.span`
  color: var(--inactive-color);
  font-style: italic;
`;
const Mono = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
`;
const MemberList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;
const MemberItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--primary-background);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
`;
const RemoveButton = styled.button`
  background: none;
  border: none;
  color: var(--inactive-color);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 2px 4px;
  &:hover {
    color: #c33;
  }
`;
const AddMemberRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;
const AddMemberButton = styled.button`
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--header-background);
  color: var(--header-color);
  border: 1px solid var(--header-background);
  border-radius: 4px;
  font-size: 0.85em;
  cursor: pointer;
  white-space: nowrap;
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const GroupEdit = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const groupId = params.groupId as string;
  const user = useUserStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["manage-group", groupId, user?.id ?? null],
    queryFn: () => groupsService.get(groupId),
    enabled: !!groupId && !!user?.isAdmin(),
  });
  const membersQuery = useQuery({
    queryKey: ["manage-group-members", groupId, user?.id ?? null],
    queryFn: () => groupsService.getMembers(groupId),
    enabled: !!groupId && !!user?.isAdmin(),
  });
  const usersQuery = useQuery({
    queryKey: ["manage-users", user?.id ?? null],
    queryFn: () => usersService.getAll(),
    enabled: !!user?.isAdmin(),
  });

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [picked, setPicked] = React.useState<string>("");

  React.useEffect(() => {
    if (data) {
      setTitle(data.title ?? "");
      setDescription(data.description ?? "");
      setSaveError(null);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const patch: GroupUpdatePatch = {};
      if (title !== (data?.title ?? "")) patch.title = title;
      if (description !== (data?.description ?? "")) patch.description = description;
      return groupsService.update(groupId, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["manage-groups"] });
      setEditing(false);
    },
    onError: (err: Error) => {
      setSaveError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => groupsService.remove(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-groups"] });
      navigate("/m/groups");
    },
    onError: (err: Error) => {
      setSaveError(err.message);
      setConfirmingDelete(false);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => groupsService.addMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["manage-group-members", groupId],
      });
      setPicked("");
    },
    onError: (err: Error) => {
      setSaveError(err.message);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      groupsService.removeMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["manage-group-members", groupId],
      });
    },
    onError: (err: Error) => {
      setSaveError(err.message);
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
    if (data) {
      setTitle(data.title ?? "");
      setDescription(data.description ?? "");
    }
    setSaveError(null);
    setEditing(false);
  };

  if (isLoading) return <Root><Notice>{t("loading")}</Notice></Root>;
  if (isError || !data) {
    return (
      <Root>
        <Notice>{t("manage-group-load-error")}</Notice>
      </Root>
    );
  }

  const group = data as GroupRow;
  const members = (membersQuery.data as string[] | undefined) ?? [];
  const allUsers = (usersQuery.data as UserRow[] | undefined) ?? [];
  const memberSet = new Set(members);
  const availableUsers = allUsers
    .filter((u) => !memberSet.has(u.id))
    .filter((u) => !u.id.startsWith(":")) // hide :guest
    .sort((a, b) => a.id.localeCompare(b.id));

  const renderValue = (value: string | undefined): React.ReactNode =>
    value && value.length > 0 ? (
      value
    ) : (
      <SummaryEmpty>{t("manage-group-summary-empty")}</SummaryEmpty>
    );

  return (
    <Root>
      <TitleRow>
        <Title>
          <Mono>{groupId}</Mono>
        </Title>
      </TitleRow>
      {saveError && (
        <ErrorBanner>
          {t("manage-group-save-error")}
          {": "}
          {saveError}
        </ErrorBanner>
      )}

      {editing ? (
        <>
          <Section>
            <SectionTitle>{t("manage-group-section-content")}</SectionTitle>
            <Field>
              <FieldLabel>{t("manage-group-field-title")}</FieldLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>{t("manage-group-field-description")}</FieldLabel>
              <TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </Section>
          <Footer>
            <span />
            <FooterRight>
              <ButtonSecondary
                type="button"
                onClick={handleCancelEdit}
                disabled={updateMutation.isPending}
              >
                {t("manage-group-button-cancel")}
              </ButtonSecondary>
              <ButtonPrimary
                type="button"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending
                  ? t("manage-group-button-saving")
                  : t("manage-group-button-save")}
              </ButtonPrimary>
            </FooterRight>
          </Footer>
        </>
      ) : (
        <>
          <Section>
            <SectionTitle>{t("manage-group-section-content")}</SectionTitle>
            <Summary>
              <SummaryLabel>{t("manage-group-field-title")}</SummaryLabel>
              <SummaryValue>{renderValue(group.title)}</SummaryValue>
              <SummaryLabel>{t("manage-group-field-description")}</SummaryLabel>
              <SummaryValue>{renderValue(group.description)}</SummaryValue>
            </Summary>
          </Section>

          <Section>
            <SectionTitle>{t("manage-group-section-members")}</SectionTitle>
            {membersQuery.isLoading ? (
              <Notice>{t("loading")}</Notice>
            ) : members.length === 0 ? (
              <Notice>{t("manage-group-members-empty")}</Notice>
            ) : (
              <MemberList>
                {members.map((id) => (
                  <MemberItem key={id}>
                    <Mono>{id}</Mono>
                    <RemoveButton
                      type="button"
                      onClick={() => removeMemberMutation.mutate(id)}
                      disabled={removeMemberMutation.isPending}
                      aria-label={String(
                        t("manage-group-members-remove", { id })
                      )}
                      title={String(t("manage-group-members-remove", { id }))}
                    >
                      <BsXLg />
                    </RemoveButton>
                  </MemberItem>
                ))}
              </MemberList>
            )}
            <AddMemberRow>
              <Select
                value={picked}
                onChange={(e) => setPicked(e.target.value)}
                disabled={availableUsers.length === 0}
              >
                <option value="">
                  {availableUsers.length === 0
                    ? t("manage-group-members-no-available")
                    : t("manage-group-members-pick-user")}
                </option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id}
                    {u.isAdmin ? " (" + t("manage-users-role-admin") + ")" : ""}
                  </option>
                ))}
              </Select>
              <AddMemberButton
                type="button"
                onClick={() =>
                  picked ? addMemberMutation.mutate(picked) : undefined
                }
                disabled={!picked || addMemberMutation.isPending}
              >
                <BsPlus aria-hidden />
                {t("manage-group-members-add")}
              </AddMemberButton>
            </AddMemberRow>
          </Section>

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
              {t("manage-group-button-delete")}
            </ButtonDanger>
            <FooterRight>
              <ButtonPrimary type="button" onClick={handleStartEdit}>
                <BsPencilSquare aria-hidden />
                {t("manage-group-button-edit")}
              </ButtonPrimary>
            </FooterRight>
          </Footer>
        </>
      )}

      {confirmingDelete && (
        <ConfirmPanel role="alertdialog" aria-labelledby="delete-confirm-heading">
          <ConfirmHeading id="delete-confirm-heading">
            {t("manage-group-delete-heading", { id: groupId })}
          </ConfirmHeading>
          <ConfirmBody>{t("manage-group-delete-body")}</ConfirmBody>
          <ConfirmActions>
            <ButtonSecondary
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleteMutation.isPending}
            >
              {t("manage-group-button-cancel")}
            </ButtonSecondary>
            <ButtonDanger
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <BsTrash aria-hidden />
              {deleteMutation.isPending
                ? t("manage-group-button-deleting")
                : t("manage-group-button-confirm-delete")}
            </ButtonDanger>
          </ConfirmActions>
        </ConfirmPanel>
      )}
    </Root>
  );
};

export default GroupEdit;
