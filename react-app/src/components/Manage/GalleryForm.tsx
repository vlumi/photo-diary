import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import {
  type EpochType,
  type GalleryUpdatePatch,
  type InitialView,
  type Theme,
} from "../../services/galleries";
import theme, { THEME_CATEGORIES, type ThemeCategory } from "../../lib/theme";

// Enum values must mirror server's GalleryUpdateBody. Kept inline
// rather than importing from api-schema so the dropdowns don't
// silently lose values if the typegen output rearranges.
const EPOCH_TYPES: EpochType[] = ["birthday", "1-index", "0-index"];
const INITIAL_VIEWS: InitialView[] = ["year", "month", "day", "photo"];

export interface FormState {
  title: string;
  description: string;
  icon: string;
  epoch: string;
  epochType: string;
  theme: string;
  initialView: string;
  hostname: string;
}

export const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  icon: "",
  epoch: "",
  epochType: "",
  theme: "",
  initialView: "",
  hostname: "",
};

interface GalleryData {
  title?: string;
  description?: string;
  icon?: string;
  epoch?: string;
  epochType?: string;
  theme?: string;
  initialView?: string;
  hostname?: string;
}

export const fromGalleryData = (g: GalleryData): FormState => ({
  title: g.title ?? "",
  description: g.description ?? "",
  icon: g.icon ?? "",
  epoch: g.epoch ?? "",
  epochType: g.epochType ?? "",
  theme: g.theme ?? "",
  initialView: g.initialView ?? "",
  hostname: g.hostname ?? "",
});

// Build the PUT body from the form. Empty strings become undefined
// for enum fields (server's update query keys on column-presence,
// so an absent field is a no-op) and pass through as empty strings
// on free-text fields (server accepts empty title / description /
// etc.).
export const toPatch = (form: FormState): GalleryUpdatePatch => ({
  title: form.title,
  description: form.description,
  icon: form.icon,
  epoch: form.epoch,
  epochType: (form.epochType || undefined) as EpochType | undefined,
  theme: (form.theme || undefined) as Theme | undefined,
  initialView: (form.initialView || undefined) as InitialView | undefined,
  hostname: form.hostname,
});

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
  width: 100%;
  box-sizing: border-box;
`;

interface Props {
  form: FormState;
  setField: (key: keyof FormState, value: string) => void;
}

const GalleryFormFields = ({ form, setField }: Props): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <>
      <Section>
        <SectionTitle>{t("manage-gallery-section-content")}</SectionTitle>
        <Field>
          <FieldLabel>{t("manage-gallery-field-title")}</FieldLabel>
          <Input
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>{t("manage-gallery-field-description")}</FieldLabel>
          <TextArea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>{t("manage-gallery-field-icon")}</FieldLabel>
          <Input
            value={form.icon}
            onChange={(e) => setField("icon", e.target.value)}
          />
          <FieldHint>{t("manage-gallery-field-icon-hint")}</FieldHint>
        </Field>
      </Section>

      <Section>
        <SectionTitle>{t("manage-gallery-section-display")}</SectionTitle>
        <Field>
          <FieldLabel>{t("manage-gallery-field-theme")}</FieldLabel>
          <Select
            value={form.theme}
            onChange={(e) => setField("theme", e.target.value)}
          >
            <option value="">{t("manage-gallery-enum-default")}</option>
            {THEME_CATEGORIES.map((category: ThemeCategory) => {
              const entries = theme.manifest.filter(
                (e) => e.category === category
              );
              if (entries.length === 0) return null;
              return (
                <optgroup
                  key={category}
                  label={String(t(`theme-group-${category}`))}
                >
                  {entries.map((e) => (
                    <option key={e.id} value={e.id as Theme}>
                      {e.displayName}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </Select>
        </Field>
        <Field>
          <FieldLabel>{t("manage-gallery-field-initial-view")}</FieldLabel>
          <Select
            value={form.initialView}
            onChange={(e) => setField("initialView", e.target.value)}
          >
            <option value="">{t("manage-gallery-enum-default")}</option>
            {INITIAL_VIEWS.map((iv) => (
              <option key={iv} value={iv}>
                {iv}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section>
        <SectionTitle>{t("manage-gallery-section-epoch")}</SectionTitle>
        <Field>
          <FieldLabel>{t("manage-gallery-field-epoch")}</FieldLabel>
          <Input
            value={form.epoch}
            onChange={(e) => setField("epoch", e.target.value)}
            placeholder="YYYY-MM-DD"
          />
          <FieldHint>{t("manage-gallery-field-epoch-hint")}</FieldHint>
        </Field>
        <Field>
          <FieldLabel>{t("manage-gallery-field-epoch-type")}</FieldLabel>
          <Select
            value={form.epochType}
            onChange={(e) => setField("epochType", e.target.value)}
          >
            <option value="">{t("manage-gallery-enum-default")}</option>
            {EPOCH_TYPES.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section>
        <SectionTitle>{t("manage-gallery-section-scope")}</SectionTitle>
        <Field>
          <FieldLabel>{t("manage-gallery-field-hostname")}</FieldLabel>
          <Input
            value={form.hostname}
            onChange={(e) => setField("hostname", e.target.value)}
          />
          <FieldHint>{t("manage-gallery-field-hostname-hint")}</FieldHint>
        </Field>
      </Section>
    </>
  );
};

export default GalleryFormFields;
