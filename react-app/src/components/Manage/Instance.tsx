import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import metaService, { type KnownMetaKey } from "../../services/meta";
import { useUserStore } from "../../stores";
import { BETA_FEATURES, type BetaFeature, type BetaMode } from "../../stores/beta";
import theme from "../../lib/theme";

const Root = styled.div`
  padding: 24px 16px;
  max-width: 720px;
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
  gap: 14px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--inactive-color);
  &:last-of-type {
    border-bottom: none;
  }
`;
const SectionTitle = styled.h3`
  margin: 0;
  font-size: 1em;
  color: var(--inactive-color);
  font-weight: 600;
`;
const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
const FieldLabel = styled.span`
  font-size: 0.85em;
  font-weight: 600;
`;
const FieldHint = styled.span`
  font-size: 0.75em;
  color: var(--inactive-color);
  font-style: italic;
`;
const FieldBaseStyle = `
  font: inherit;
  padding: 6px 8px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
`;
const Input = styled.input`
  ${FieldBaseStyle}
`;
const Select = styled.select`
  ${FieldBaseStyle}
`;
const TextArea = styled.textarea`
  ${FieldBaseStyle}
  min-height: 80px;
  resize: vertical;
`;
const BetaRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 12px;
  align-items: center;
`;
const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  position: sticky;
  bottom: 0;
  background: var(--primary-background);
  padding: 12px 0;
  border-top: 1px solid var(--inactive-color);
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
const Notice = styled.div`
  padding: 20px 8px;
  color: var(--inactive-color);
`;

interface MetaShape {
  name?: string;
  description?: string;
  cdn?: string;
  image?: string;
  defaultGallery?: string;
  defaultTheme?: string;
  defaultLanguage?: string;
  initialGalleryView?: string;
  firstWeekday?: string | number;
  betaFeatures?: Partial<Record<BetaFeature, BetaMode>>;
}

interface FormState {
  name: string;
  description: string;
  cdn: string;
  image: string;
  defaultGallery: string;
  defaultTheme: string;
  defaultLanguage: string;
  initialGalleryView: string;
  firstWeekday: string;
  betaFeatures: Record<BetaFeature, BetaMode>;
}

const SUPPORTED_LANGUAGES = ["en", "fi", "ja"] as const;
const INITIAL_VIEWS = ["year", "month", "day", "photo"] as const;
const FIRST_WEEKDAYS = [
  { value: "", label: "default" },
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
] as const;
const BETA_MODES: BetaMode[] = ["user", "on", "off"];

const emptyBeta = (): Record<BetaFeature, BetaMode> =>
  Object.fromEntries(BETA_FEATURES.map((f) => [f, "user"])) as Record<
    BetaFeature,
    BetaMode
  >;

const emptyForm = (): FormState => ({
  name: "",
  description: "",
  cdn: "",
  image: "",
  defaultGallery: "",
  defaultTheme: "",
  defaultLanguage: "",
  initialGalleryView: "",
  firstWeekday: "",
  betaFeatures: emptyBeta(),
});

const formFromMeta = (meta: MetaShape | undefined): FormState => {
  const base = emptyForm();
  if (!meta) return base;
  if (meta.name) base.name = meta.name;
  if (meta.description) base.description = meta.description;
  if (meta.cdn) base.cdn = meta.cdn;
  if (meta.image) base.image = meta.image;
  if (meta.defaultGallery) base.defaultGallery = meta.defaultGallery;
  if (meta.defaultTheme) base.defaultTheme = meta.defaultTheme;
  if (meta.defaultLanguage) base.defaultLanguage = meta.defaultLanguage;
  if (meta.initialGalleryView) base.initialGalleryView = meta.initialGalleryView;
  if (meta.firstWeekday !== undefined && meta.firstWeekday !== "")
    base.firstWeekday = String(meta.firstWeekday);
  if (meta.betaFeatures) {
    for (const f of BETA_FEATURES) {
      const v = meta.betaFeatures[f];
      if (v === "on" || v === "off" || v === "user") base.betaFeatures[f] = v;
    }
  }
  return base;
};

// Stringified meta payloads for diffing — beta features collapse
// to one JSON-encoded value, the rest are plain strings.
const SCALAR_KEYS: Array<Exclude<keyof FormState, "betaFeatures">> = [
  "name",
  "description",
  "cdn",
  "image",
  "defaultGallery",
  "defaultTheme",
  "defaultLanguage",
  "initialGalleryView",
  "firstWeekday",
];

const themeOptions = theme.manifest.map((t) => t.id);

const Instance = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useUserStore((s) => s.user);
  const isAdmin = !!user?.isAdmin();

  const metaQuery = useQuery({
    queryKey: ["meta"],
    queryFn: () => metaService.getAll(),
    enabled: isAdmin,
  });
  const meta = metaQuery.data as MetaShape | undefined;

  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [original, setOriginal] = React.useState<FormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!meta) return;
    const f = formFromMeta(meta);
    setForm(f);
    setOriginal(f);
  }, [meta]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const dirty = React.useMemo(() => {
    for (const k of SCALAR_KEYS) {
      if (form[k].trim() !== original[k].trim()) return true;
    }
    for (const f of BETA_FEATURES) {
      if (form.betaFeatures[f] !== original.betaFeatures[f]) return true;
    }
    return false;
  }, [form, original]);

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    setError(null);
    try {
      // Scalar keys: trim, save if changed. Empty string clears
      // the meta row (DELETE), so the .env fallback (and the
      // SPA's built-in default below that) apply again.
      for (const k of SCALAR_KEYS) {
        const cur = form[k].trim();
        const orig = original[k].trim();
        if (cur === orig) continue;
        const publicKey = k as KnownMetaKey;
        if (cur === "") {
          await metaService.remove(publicKey);
        } else {
          await metaService.set(publicKey, cur);
        }
      }
      // Beta features: only POST when something differs. A map of
      // all-user (the default) clears the row.
      const betaChanged = BETA_FEATURES.some(
        (f) => form.betaFeatures[f] !== original.betaFeatures[f]
      );
      if (betaChanged) {
        const allDefault = BETA_FEATURES.every(
          (f) => form.betaFeatures[f] === "user"
        );
        if (allDefault) {
          await metaService.remove("betaFeatures");
        } else {
          await metaService.set(
            "betaFeatures",
            JSON.stringify(form.betaFeatures)
          );
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["meta"] });
      // Refetch to reseed `original` so `dirty` resets cleanly.
      // useEffect on `meta` re-runs and re-syncs.
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("manage-instance-save-error")
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <Root>
        <Notice>{t("manage-not-admin")}</Notice>
      </Root>
    );
  }
  if (metaQuery.isLoading) {
    return (
      <Root>
        <Notice>{t("loading")}</Notice>
      </Root>
    );
  }

  return (
    <Root>
      <Title>{t("manage-instance-title")}</Title>
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <Section>
        <SectionTitle>{t("manage-instance-identity")}</SectionTitle>
        <Field>
          <FieldLabel>{t("manage-instance-field-name")}</FieldLabel>
          <Input
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
          />
          <FieldHint>{t("manage-instance-field-name-hint")}</FieldHint>
        </Field>
        <Field>
          <FieldLabel>{t("manage-instance-field-description")}</FieldLabel>
          <TextArea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>{t("manage-instance-field-cdn")}</FieldLabel>
          <Input
            value={form.cdn}
            onChange={(e) => setField("cdn", e.target.value)}
            placeholder="https://cdn.example.com"
          />
          <FieldHint>{t("manage-instance-field-cdn-hint")}</FieldHint>
        </Field>
        <Field>
          <FieldLabel>{t("manage-instance-field-image")}</FieldLabel>
          <Input
            value={form.image}
            onChange={(e) => setField("image", e.target.value)}
          />
        </Field>
      </Section>

      <Section>
        <SectionTitle>{t("manage-instance-defaults")}</SectionTitle>
        <FieldHint>{t("manage-instance-defaults-hint")}</FieldHint>
        <Field>
          <FieldLabel>{t("manage-instance-field-default-gallery")}</FieldLabel>
          <Input
            value={form.defaultGallery}
            onChange={(e) => setField("defaultGallery", e.target.value)}
            placeholder=""
          />
          <FieldHint>
            {t("manage-instance-field-default-gallery-hint")}
          </FieldHint>
        </Field>
        <Field>
          <FieldLabel>{t("manage-instance-field-default-theme")}</FieldLabel>
          <Select
            value={form.defaultTheme}
            onChange={(e) => setField("defaultTheme", e.target.value)}
          >
            <option value="">{t("manage-instance-default-empty")}</option>
            {themeOptions.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <FieldLabel>
            {t("manage-instance-field-default-language")}
          </FieldLabel>
          <Select
            value={form.defaultLanguage}
            onChange={(e) => setField("defaultLanguage", e.target.value)}
          >
            <option value="">{t("manage-instance-default-empty")}</option>
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <FieldLabel>
            {t("manage-instance-field-initial-gallery-view")}
          </FieldLabel>
          <Select
            value={form.initialGalleryView}
            onChange={(e) => setField("initialGalleryView", e.target.value)}
          >
            <option value="">{t("manage-instance-default-empty")}</option>
            {INITIAL_VIEWS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <FieldLabel>{t("manage-instance-field-first-weekday")}</FieldLabel>
          <Select
            value={form.firstWeekday}
            onChange={(e) => setField("firstWeekday", e.target.value)}
          >
            {FIRST_WEEKDAYS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section>
        <SectionTitle>{t("manage-instance-beta")}</SectionTitle>
        <FieldHint>{t("manage-instance-beta-hint")}</FieldHint>
        {BETA_FEATURES.map((feature) => (
          <BetaRow key={feature}>
            <span>{feature}</span>
            <Select
              value={form.betaFeatures[feature]}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  betaFeatures: {
                    ...prev.betaFeatures,
                    [feature]: e.target.value as BetaMode,
                  },
                }))
              }
            >
              {BETA_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </Select>
          </BetaRow>
        ))}
      </Section>

      <Footer>
        <ButtonSecondary type="button" onClick={() => navigate("/m")}>
          {t("manage-user-button-cancel")}
        </ButtonSecondary>
        <ButtonPrimary
          type="button"
          onClick={() => void save()}
          disabled={!dirty || saving}
        >
          {saving
            ? t("manage-user-button-saving")
            : t("manage-user-button-save")}
        </ButtonPrimary>
      </Footer>
    </Root>
  );
};

export default Instance;
