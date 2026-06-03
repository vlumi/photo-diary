import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BsImages, BsShieldLock } from "react-icons/bs";

import galleriesService, {
  type EpochType,
  type GalleryUpdatePatch,
  type InitialView,
  type Theme,
} from "../../services/galleries";
import { useUserStore } from "../../stores";

// body has text-align: center globally; cancel it here so form
// labels and section titles read flush-left rather than drifting
// to the centre of the 640px box. margin: 0 auto keeps the form
// centred on the page rather than pinned to the left edge.
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
const SiblingNav = styled.nav`
  display: inline-flex;
  gap: 8px;
`;
const SiblingLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  color: var(--primary-color);
  text-decoration: none;
  font-size: 0.85em;
  cursor: pointer;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
  }
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
const Notice = styled.p`
  color: var(--inactive-color);
  font-style: italic;
  margin: 0;
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

// Enum values must mirror server's GalleryUpdateBody. Kept inline
// rather than importing from api-schema so the dropdowns don't
// silently lose values if the typegen output rearranges.
const EPOCH_TYPES: EpochType[] = ["birthday", "1-index", "0-index"];
const THEMES: Theme[] = [
  "blue",
  "red",
  "grayscale",
  "contrast",
  "alert",
  "dark",
  "amoled",
  "forest",
  "silver",
  "showcase",
  "teal",
  "paper",
];
const INITIAL_VIEWS: InitialView[] = ["year", "month", "day", "photo"];

interface FormState {
  title: string;
  description: string;
  icon: string;
  epoch: string;
  epochType: string;
  theme: string;
  initialView: string;
  hostname: string;
}

const EMPTY_FORM: FormState = {
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
  id: string;
  title?: string;
  description?: string;
  icon?: string;
  epoch?: string;
  epochType?: string;
  theme?: string;
  initialView?: string;
  hostname?: string;
}

const toForm = (g: GalleryData): FormState => ({
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
// for enum fields (clears the override on the server) and pass
// through as empty strings on free-text fields (server accepts
// empty title / description / etc.).
const toPatch = (form: FormState): GalleryUpdatePatch => ({
  title: form.title,
  description: form.description,
  icon: form.icon,
  epoch: form.epoch,
  epochType: (form.epochType || undefined) as EpochType | undefined,
  theme: (form.theme || undefined) as Theme | undefined,
  initialView: (form.initialView || undefined) as InitialView | undefined,
  hostname: form.hostname,
});

const GalleryEdit = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const galleryId = params.galleryId as string;
  const user = useUserStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["gallery", galleryId, user?.id ?? null],
    queryFn: () => galleriesService.get(galleryId),
    enabled: !!galleryId && !!user?.isAdmin(),
  });

  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (data) {
      setForm(toForm(data as GalleryData));
      setSaveError(null);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (patch: GalleryUpdatePatch) =>
      galleriesService.update(galleryId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery", galleryId] });
      queryClient.invalidateQueries({ queryKey: ["manage-galleries"] });
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
    },
    onError: (err: Error) => {
      setSaveError(err.message);
    },
  });

  const setField = (key: keyof FormState, value: string): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const handleSave = (): void => {
    setSaveError(null);
    updateMutation.mutate(toPatch(form));
  };
  const handleCancel = (): void => {
    navigate("/m/galleries");
  };

  if (isLoading) return <Root><Notice>{t("loading")}</Notice></Root>;
  if (isError || !data) {
    return (
      <Root>
        <Notice>{t("manage-gallery-load-error")}</Notice>
      </Root>
    );
  }

  return (
    <Root>
      <TitleRow>
        <Title>{galleryId}</Title>
        <SiblingNav aria-label={String(t("manage-gallery-nav-group"))}>
          <SiblingLink
            onClick={() => navigate(`/m/g/${galleryId}/photos`)}
            role="link"
            tabIndex={0}
          >
            <BsImages aria-hidden />
            {t("manage-gallery-link-photos")}
          </SiblingLink>
          <SiblingLink
            onClick={() => navigate(`/m/g/${galleryId}/access`)}
            role="link"
            tabIndex={0}
          >
            <BsShieldLock aria-hidden />
            {t("manage-gallery-link-access")}
          </SiblingLink>
        </SiblingNav>
      </TitleRow>
      {saveError && (
        <ErrorBanner>
          {t("manage-gallery-save-error")}
          {": "}
          {saveError}
        </ErrorBanner>
      )}

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
            {THEMES.map((th) => (
              <option key={th} value={th}>
                {th}
              </option>
            ))}
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

      <Footer>
        <ButtonSecondary type="button" onClick={handleCancel}>
          {t("manage-gallery-button-cancel")}
        </ButtonSecondary>
        <ButtonPrimary
          type="button"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending
            ? t("manage-gallery-button-saving")
            : t("manage-gallery-button-save")}
        </ButtonPrimary>
      </Footer>
    </Root>
  );
};

export default GalleryEdit;
