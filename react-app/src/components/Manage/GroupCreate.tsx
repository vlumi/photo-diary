import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import groupsService, {
  type GroupCreateBody,
} from "../../services/groups";

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
// with ":" (reserved for pseudo-ids).
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

const GroupCreate = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [id, setId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const idValid = id.length > 0 && ID_PATTERN.test(id);
  const idTouched = id.length > 0;

  const createMutation = useMutation({
    mutationFn: (body: GroupCreateBody) => groupsService.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-groups"] });
      navigate(`/m/groups/${id}`);
    },
    onError: (err: Error) => {
      setSaveError(err.message);
    },
  });

  const handleSave = (): void => {
    if (!idValid) return;
    setSaveError(null);
    createMutation.mutate({
      id,
      title: title || undefined,
      description: description || undefined,
    });
  };
  const handleCancel = (): void => {
    navigate("/m/groups");
  };

  return (
    <Root>
      <Title>{t("manage-group-create-title")}</Title>
      {saveError && (
        <ErrorBanner>
          {t("manage-group-create-error")}
          {": "}
          {saveError}
        </ErrorBanner>
      )}
      <Section>
        <Field>
          <FieldLabel>{t("manage-groups-col-id")}</FieldLabel>
          <Input
            value={id}
            onChange={(e) => setId(e.target.value)}
            $invalid={idTouched && !idValid}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <FieldHint>{t("manage-group-field-id-hint")}</FieldHint>
        </Field>
        <Field>
          <FieldLabel>{t("manage-group-field-title")}</FieldLabel>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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
        <ButtonSecondary type="button" onClick={handleCancel}>
          {t("manage-group-button-cancel")}
        </ButtonSecondary>
        <ButtonPrimary
          type="button"
          onClick={handleSave}
          disabled={!idValid || createMutation.isPending}
        >
          {createMutation.isPending
            ? t("manage-group-button-creating")
            : t("manage-group-button-create")}
        </ButtonPrimary>
      </Footer>
    </Root>
  );
};

export default GroupCreate;
