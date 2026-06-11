import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import {
  type EpochType,
  type GalleryUpdatePatch,
  type InitialView,
  type Theme,
} from "../../services/galleries";
import ThemePicker from "../ThemePicker";
import IconCropper from "./IconCropper";
import LocalizedInputs, {
  SUPPORTED_LANGS,
  languageNameIn,
} from "./LocalizedInputs";
import config from "../../lib/config";

// Enum values must mirror server's GalleryUpdateBody. Kept inline
// rather than importing from api-schema so the dropdowns don't
// silently lose values if the typegen output rearranges.
const EPOCH_TYPES: EpochType[] = ["birthday", "1-index", "0-index"];
const INITIAL_VIEWS: InitialView[] = ["year", "month", "day", "photo"];

export interface FormState {
  title: string;
  description: string;
  titleLocalized: Record<string, string>;
  descriptionLocalized: Record<string, string>;
  // Operator-set primary language for the canonical title /
  // description columns. Empty string falls back to the instance
  // default. The matching overlay row for this language is hidden in
  // the UI — canonical carries that value.
  defaultLanguage: string;
  icon: string;
  epoch: string;
  epochType: string;
  theme: string;
  initialView: string;
  hostname: string;
}

const emptyLocalized = (): Record<string, string> =>
  Object.fromEntries(SUPPORTED_LANGS.map((l) => [l, ""]));

export const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  titleLocalized: emptyLocalized(),
  descriptionLocalized: emptyLocalized(),
  // Server-side `createGallery` will override with `.env DEFAULT_LANGUAGE`
  // if the API caller omits this, but the form always renders a value
  // since the column is now NOT NULL.
  defaultLanguage: "en",
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
  titleLocalized?: Record<string, string>;
  descriptionLocalized?: Record<string, string>;
  defaultLanguage?: string;
  icon?: string;
  epoch?: string;
  epochType?: string;
  theme?: string;
  initialView?: string;
  hostname?: string;
}

const localizedFrom = (
  map: Record<string, string> | undefined
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const lang of SUPPORTED_LANGS) out[lang] = map?.[lang] ?? "";
  return out;
};

export const fromGalleryData = (g: GalleryData): FormState => ({
  title: g.title ?? "",
  description: g.description ?? "",
  titleLocalized: localizedFrom(g.titleLocalized),
  descriptionLocalized: localizedFrom(g.descriptionLocalized),
  defaultLanguage: g.defaultLanguage ?? "en",
  icon: g.icon ?? "",
  epoch: g.epoch ?? "",
  epochType: g.epochType ?? "",
  theme: g.theme ?? "",
  initialView: g.initialView ?? "",
  hostname: g.hostname ?? "",
});

// Diff localized maps relative to the original form state. Emits only
// the entries the operator touched — empty string clears the column
// server-side (NULL in the row); unchanged entries drop. Returns
// undefined when nothing changed, so toPatch can skip the key.
const localizedDiff = (
  origMap: Record<string, string>,
  curMap: Record<string, string>
): Record<string, string> | undefined => {
  const out: Record<string, string> = {};
  for (const lang of SUPPORTED_LANGS) {
    const o = (origMap[lang] ?? "").trim();
    const c = (curMap[lang] ?? "").trim();
    if (o !== c) out[lang] = c;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

// Build the PUT body from the form. Empty strings become undefined
// for enum fields (server's update query keys on column-presence,
// so an absent field is a no-op) and pass through as empty strings
// on free-text fields (server accepts empty title / description /
// etc.). Localized maps diff against `original` so untouched languages
// drop out of the patch — keeps the upsert from creating empty rows
// for langs the operator never set.
//
// The hostname-editable flag mirrors the form's gating — non-admins
// don't render the field at all, so the patch omits it to avoid
// sending stale state to the (rejecting) server.
export const toPatch = (
  form: FormState,
  original: FormState = EMPTY_FORM,
  hostnameEditable = true
): GalleryUpdatePatch => {
  const patch: GalleryUpdatePatch = {
    title: form.title,
    description: form.description,
    icon: form.icon,
    epoch: form.epoch,
    epochType: (form.epochType || undefined) as EpochType | undefined,
    theme: (form.theme || undefined) as Theme | undefined,
    initialView: (form.initialView || undefined) as InitialView | undefined,
    ...(hostnameEditable ? { hostname: form.hostname } : {}),
  };
  const titlePatch = localizedDiff(
    original.titleLocalized,
    form.titleLocalized
  );
  if (titlePatch) patch.titleLocalized = titlePatch;
  const descPatch = localizedDiff(
    original.descriptionLocalized,
    form.descriptionLocalized
  );
  if (descPatch) patch.descriptionLocalized = descPatch;
  if (form.defaultLanguage && form.defaultLanguage !== original.defaultLanguage) {
    patch.defaultLanguage = form.defaultLanguage;
  }
  return patch;
};

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

interface PhotoLike {
  id: string;
}

interface IconSource {
  photoId: string;
  crop?: { x: number; y: number; width: number; height: number };
}

interface Props {
  form: FormState;
  setField: (key: keyof FormState, value: string) => void;
  setLocalized: (
    key: "titleLocalized" | "descriptionLocalized",
    lang: string,
    value: string
  ) => void;
  // When both are present the icon field renders the cropper UI:
  // current icon preview + Adjust button. Absent → falls back to a
  // text input (Create flow has no gallery row yet so the cropper
  // endpoint would 404).
  galleryId?: string;
  photos?: PhotoLike[];
  iconSource?: IconSource | null;
  // Auto-open the cropper modal on mount — used when the operator
  // arrived via `?openIcon=<photoId>` from a photo view.
  autoOpenCropper?: boolean;
  // Called after the cropper modal closes (save or cancel), so the
  // parent can clear a one-shot `bootstrap` source that fed
  // `iconSource` for the auto-opened session.
  onCropperClosed?: () => void;
  onIconChanged?: (icon: string) => void;
  // Hostname routing is instance-level — only global admins can
  // edit it. Gallery-editors get the form without the Scope
  // section at all (rather than a disabled input) so the field
  // isn't a teaser they can't act on. Defaults to true so the
  // Create flow (global-admin-only) keeps the section.
  hostnameEditable?: boolean;
}

const IconPreview = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 4px;
  border: 1px solid var(--inactive-color);
  display: block;
`;
const IconRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;
const AdjustButton = styled.button`
  padding: 4px 10px;
  border: 1px solid var(--inactive-color);
  background: transparent;
  color: var(--primary-color);
  font: inherit;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    border-color: var(--primary-color);
  }
`;

const GalleryFormFields = ({
  form,
  setField,
  setLocalized,
  galleryId,
  photos,
  iconSource,
  autoOpenCropper,
  onCropperClosed,
  onIconChanged,
  hostnameEditable = true,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const [cropperOpen, setCropperOpen] = React.useState(false);
  const canCrop = !!galleryId && !!photos;
  React.useEffect(() => {
    if (autoOpenCropper && canCrop) setCropperOpen(true);
  }, [autoOpenCropper, canCrop]);
  const closeCropper = () => {
    setCropperOpen(false);
    onCropperClosed?.();
  };
  return (
    <>
      <Section>
        <SectionTitle>{t("manage-gallery-section-content")}</SectionTitle>
        <Field>
          <FieldLabel>
            {t("manage-gallery-field-title")}
            {form.defaultLanguage ? ` (${form.defaultLanguage})` : ""}
          </FieldLabel>
          <Input
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
          />
          <LocalizedInputs
            value={form.titleLocalized}
            onChange={(lang, val) => setLocalized("titleLocalized", lang, val)}
            primary={form.defaultLanguage || null}
          />
        </Field>
        <Field>
          <FieldLabel>
            {t("manage-gallery-field-description")}
            {form.defaultLanguage ? ` (${form.defaultLanguage})` : ""}
          </FieldLabel>
          <TextArea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
          />
          <LocalizedInputs
            value={form.descriptionLocalized}
            onChange={(lang, val) =>
              setLocalized("descriptionLocalized", lang, val)
            }
            primary={form.defaultLanguage || null}
            multiline
          />
        </Field>
        <Field>
          <FieldLabel>{t("manage-gallery-field-default-language")}</FieldLabel>
          <Select
            value={form.defaultLanguage}
            onChange={(e) => setField("defaultLanguage", e.target.value)}
          >
            {SUPPORTED_LANGS.map((lang) => (
              <option key={lang} value={lang}>
                {languageNameIn(lang, form.defaultLanguage)}
              </option>
            ))}
          </Select>
          <FieldHint>
            {t("manage-gallery-field-default-language-hint")}
          </FieldHint>
        </Field>
        <Field>
          <FieldLabel>{t("manage-gallery-field-icon")}</FieldLabel>
          {canCrop ? (
            <IconRow>
              {form.icon ? (
                <IconPreview
                  src={`${config.PHOTO_ROOT_URL}${form.icon}`}
                  alt=""
                />
              ) : null}
              <AdjustButton
                type="button"
                onClick={() => setCropperOpen(true)}
              >
                {iconSource
                  ? t("manage-gallery-icon-adjust")
                  : t("manage-gallery-icon-pick")}
              </AdjustButton>
            </IconRow>
          ) : (
            <Input
              value={form.icon}
              onChange={(e) => setField("icon", e.target.value)}
            />
          )}
          {!canCrop ? (
            <FieldHint>{t("manage-gallery-field-icon-hint")}</FieldHint>
          ) : null}
        </Field>
      </Section>
      {canCrop && cropperOpen ? (
        <IconCropper
          galleryId={galleryId as string}
          photos={photos as PhotoLike[]}
          initialSource={iconSource ?? null}
          onClose={closeCropper}
          onSaved={(icon) => {
            closeCropper();
            setField("icon", icon);
            onIconChanged?.(icon);
          }}
        />
      ) : null}

      <Section>
        <SectionTitle>{t("manage-gallery-section-display")}</SectionTitle>
        <Field>
          <FieldLabel>{t("manage-gallery-field-theme")}</FieldLabel>
          <ThemePicker
            value={form.theme || null}
            onChange={(id) => setField("theme", id ?? "")}
            defaultLabel={String(t("manage-gallery-enum-default"))}
          />
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

      {hostnameEditable && (
        <Section>
          <SectionTitle>{t("manage-gallery-section-scope")}</SectionTitle>
          <Field>
            <FieldLabel>{t("manage-gallery-field-hostname")}</FieldLabel>
            <Input
              value={form.hostname}
              onChange={(e) => setField("hostname", e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <FieldHint>{t("manage-gallery-field-hostname-hint")}</FieldHint>
          </Field>
        </Section>
      )}
    </>
  );
};

export default GalleryFormFields;
