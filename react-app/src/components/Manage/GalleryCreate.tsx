import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import galleriesService, {
  type GalleryCreateBody,
} from "../../services/galleries";
import GalleryFormFields, {
  EMPTY_FORM,
  toPatch,
  type FormState,
} from "./GalleryForm";

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
const IdSection = styled.section`
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

// Server-side `id` pattern: minLength 1, must not start with ":"
// (pseudo-galleries reserved). We surface the rule client-side so
// the operator gets immediate feedback instead of a 400 round-trip.
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

const GalleryCreate = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [id, setId] = React.useState("");
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const idValid = id.length > 0 && ID_PATTERN.test(id);
  const idTouched = id.length > 0;

  const createMutation = useMutation({
    mutationFn: (body: GalleryCreateBody) => galleriesService.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-galleries"] });
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
      navigate(`/m/g/${id}`);
    },
    onError: (err: Error) => {
      setSaveError(err.message);
    },
  });

  const setField = (key: keyof FormState, value: string): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const handleSave = (): void => {
    if (!idValid) return;
    setSaveError(null);
    createMutation.mutate({ id, ...toPatch(form) });
  };
  const handleCancel = (): void => {
    navigate("/m/galleries");
  };

  return (
    <Root>
      <Title>{t("manage-gallery-create-title")}</Title>
      {saveError && (
        <ErrorBanner>
          {t("manage-gallery-create-error")}
          {": "}
          {saveError}
        </ErrorBanner>
      )}

      <IdSection>
        <SectionTitle>{t("manage-gallery-section-identifier")}</SectionTitle>
        <Field>
          <FieldLabel>{t("manage-gallery-field-id")}</FieldLabel>
          <Input
            value={id}
            onChange={(e) => setId(e.target.value)}
            $invalid={idTouched && !idValid}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <FieldHint>{t("manage-gallery-field-id-hint")}</FieldHint>
        </Field>
      </IdSection>

      <GalleryFormFields form={form} setField={setField} />

      <Footer>
        <ButtonSecondary type="button" onClick={handleCancel}>
          {t("manage-gallery-button-cancel")}
        </ButtonSecondary>
        <ButtonPrimary
          type="button"
          onClick={handleSave}
          disabled={!idValid || createMutation.isPending}
        >
          {createMutation.isPending
            ? t("manage-gallery-button-creating")
            : t("manage-gallery-button-create")}
        </ButtonPrimary>
      </Footer>
    </Root>
  );
};

export default GalleryCreate;
