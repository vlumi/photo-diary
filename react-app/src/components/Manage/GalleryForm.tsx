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
import config from "../../lib/config";

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
  galleryId,
  photos,
  iconSource,
  autoOpenCropper,
  onCropperClosed,
  onIconChanged,
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
    </>
  );
};

export default GalleryFormFields;
