import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BsX } from "react-icons/bs";

import photosService, {
  type MissingField,
  type PhotoUpdatePatch,
} from "../../services/photos";
import useKeyPress from "../../lib/keypress";
import config from "../../lib/config";

// Floating side panel pinned to the right; the grid behind stays
// interactive so an operator can click a different tile and the
// drawer reloads with that photo's data. No backdrop — close requires
// Esc, Cancel, or the close button.
const Drawer = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  width: min(520px, 100%);
  height: 100dvh;
  background: var(--primary-background);
  color: var(--primary-color);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
  z-index: 1100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
`;
const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--inactive-color);
  flex: 0 0 auto;
`;
const Title = styled.div`
  font-weight: bold;
  font-size: 0.95em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1 1 auto;
  min-width: 0;
`;
const CloseButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  font-size: 1.5em;
  cursor: pointer;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  &:hover {
    color: var(--inactive-color);
  }
`;
const Body = styled.div`
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;
const Preview = styled.img`
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  background: var(--tile-background);
  border-radius: 2px;
`;
const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;
const SectionTitle = styled.h3`
  margin: 0;
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
const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
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
const Input = styled.input<{ $highlight?: boolean }>`
  font: inherit;
  padding: 6px 8px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid
    ${({ $highlight }) =>
    $highlight ? "var(--header-color)" : "var(--inactive-color)"};
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
`;
const TextArea = styled.textarea<{ $highlight?: boolean }>`
  font: inherit;
  padding: 6px 8px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid
    ${({ $highlight }) =>
    $highlight ? "var(--header-color)" : "var(--inactive-color)"};
  border-radius: 4px;
  width: 100%;
  min-height: 60px;
  box-sizing: border-box;
  resize: vertical;
`;
const ReadOnly = styled.div`
  font-size: 0.85em;
  color: var(--inactive-color);
  white-space: pre-wrap;
  word-break: break-word;
`;
const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--inactive-color);
  flex: 0 0 auto;
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
  background: rgba(220, 60, 60, 0.15);
  color: var(--primary-color);
  border-radius: 4px;
  font-size: 0.85em;
`;

interface PhotoData {
  id: string;
  title?: string;
  description?: string;
  originalFilename?: string;
  taken?: {
    author?: string;
    instant?: { timestamp?: string };
    location?: {
      country?: string;
      place?: string;
      coordinates?: {
        latitude?: number | null;
        longitude?: number | null;
        altitude?: number | null;
      };
    };
  };
  camera?: { make?: string; model?: string };
  lens?: { make?: string; model?: string };
  exposure?: {
    focalLength?: number;
    aperture?: number;
    iso?: number;
    exposureTime?: number;
  };
  geocoded?: {
    countryCode?: string;
    stateCode?: string;
    state?: string;
    city?: string;
  };
}

// Editable subset of the photo — mirrors the server's PhotoUpdateBody
// schema. EXIF / geocoded fields stay read-only.
interface FormState {
  title: string;
  description: string;
  author: string;
  country: string;
  place: string;
  cameraMake: string;
  cameraModel: string;
  lensMake: string;
  lensModel: string;
  focalLength: string;
  aperture: string;
}

const emptyForm = (): FormState => ({
  title: "",
  description: "",
  author: "",
  country: "",
  place: "",
  cameraMake: "",
  cameraModel: "",
  lensMake: "",
  lensModel: "",
  focalLength: "",
  aperture: "",
});

const formFrom = (p: PhotoData): FormState => ({
  title: p.title ?? "",
  description: p.description ?? "",
  author: p.taken?.author ?? "",
  country: p.taken?.location?.country ?? "",
  place: p.taken?.location?.place ?? "",
  cameraMake: p.camera?.make ?? "",
  cameraModel: p.camera?.model ?? "",
  lensMake: p.lens?.make ?? "",
  lensModel: p.lens?.model ?? "",
  focalLength:
    p.exposure?.focalLength !== undefined && p.exposure.focalLength !== null
      ? String(p.exposure.focalLength)
      : "",
  aperture:
    p.exposure?.aperture !== undefined && p.exposure.aperture !== null
      ? String(p.exposure.aperture)
      : "",
});

// Reduce a form state to the changed fields, shaped to PhotoUpdatePatch.
// Empty-string trims to undefined so the server doesn't reject the
// pre-existing empty value as an unchanged write.
const patchFrom = (
  original: FormState,
  current: FormState
): PhotoUpdatePatch => {
  const patch: PhotoUpdatePatch = {};
  const trim = (s: string) => s.trim();
  if (trim(current.title) !== trim(original.title)) {
    patch.title = trim(current.title);
  }
  if (trim(current.description) !== trim(original.description)) {
    patch.description = trim(current.description);
  }
  const takenLocation: NonNullable<
    NonNullable<PhotoUpdatePatch["taken"]>["location"]
  > = {};
  if (trim(current.country) !== trim(original.country)) {
    takenLocation.country = trim(current.country);
  }
  if (trim(current.place) !== trim(original.place)) {
    takenLocation.place = trim(current.place);
  }
  const taken: NonNullable<PhotoUpdatePatch["taken"]> = {};
  if (trim(current.author) !== trim(original.author)) {
    taken.author = trim(current.author);
  }
  if (Object.keys(takenLocation).length > 0) taken.location = takenLocation;
  if (Object.keys(taken).length > 0) patch.taken = taken;
  const camera: NonNullable<PhotoUpdatePatch["camera"]> = {};
  if (trim(current.cameraMake) !== trim(original.cameraMake)) {
    camera.make = trim(current.cameraMake);
  }
  if (trim(current.cameraModel) !== trim(original.cameraModel)) {
    camera.model = trim(current.cameraModel);
  }
  if (Object.keys(camera).length > 0) patch.camera = camera;
  const lens: NonNullable<PhotoUpdatePatch["lens"]> = {};
  if (trim(current.lensMake) !== trim(original.lensMake)) {
    lens.make = trim(current.lensMake);
  }
  if (trim(current.lensModel) !== trim(original.lensModel)) {
    lens.model = trim(current.lensModel);
  }
  if (Object.keys(lens).length > 0) patch.lens = lens;
  const exposure: NonNullable<PhotoUpdatePatch["exposure"]> = {};
  if (current.focalLength.trim() !== original.focalLength.trim()) {
    const v = parseFloat(current.focalLength);
    if (!Number.isNaN(v)) exposure.focalLength = v;
  }
  if (current.aperture.trim() !== original.aperture.trim()) {
    const v = parseFloat(current.aperture);
    if (!Number.isNaN(v)) exposure.aperture = v;
  }
  if (Object.keys(exposure).length > 0) patch.exposure = exposure;
  return patch;
};

// Which `missing=…` chips are active in the URL, so the drawer can
// highlight the corresponding empty fields with a "this is why the
// photo matched the filter" hint.
const activeMissing = (searchParams: URLSearchParams): Set<MissingField> => {
  const out = new Set<MissingField>();
  for (const m of searchParams.getAll("missing")) {
    out.add(m as MissingField);
  }
  return out;
};

const PhotoDrawer = (): React.ReactElement => {
  const { t } = useTranslation();
  const { photoId } = useParams<{ photoId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const id = photoId!;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["manage-photo", id],
    queryFn: () => photosService.get(id) as Promise<PhotoData>,
  });

  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [original, setOriginal] = React.useState<FormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (data) {
      const f = formFrom(data);
      setForm(f);
      setOriginal(f);
      setError(null);
    }
  }, [data]);

  const close = React.useCallback(() => {
    // Strip /<photoId> from the pathname, keep search.
    const base = window.location.pathname.replace(/\/[^/]+$/, "");
    navigate({ pathname: base, search: window.location.search });
  }, [navigate]);

  useKeyPress("Escape", close);

  const missingActive = activeMissing(searchParams);
  const highlight = {
    title: missingActive.has("title") && !original.title,
    description: missingActive.has("description") && !original.description,
    author: missingActive.has("author") && !original.author,
    country: missingActive.has("country") && !original.country,
    place: missingActive.has("place") && !original.place,
  };

  const dirty = React.useMemo(() => {
    const patch = patchFrom(original, form);
    return Object.keys(patch).length > 0;
  }, [original, form]);

  const save = async () => {
    const patch = patchFrom(original, form);
    if (Object.keys(patch).length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await photosService.update(id, patch);
      // Refetch this photo + the list (filter results may shift if a
      // missing-X chip is active and the field just got populated).
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["manage-photo", id] }),
        queryClient.invalidateQueries({ queryKey: ["manage-photos"] }),
      ]);
    } catch (e) {
      setError((e as Error).message || t("manage-photo-save-error"));
    } finally {
      setSaving(false);
    }
  };

  const setField = <K extends keyof FormState>(key: K, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const renderBody = () => {
    if (isLoading) return <Body>{t("loading")}</Body>;
    if (isError || !data) {
      return <Body>{t("manage-photo-load-error")}</Body>;
    }
    const lat = data.taken?.location?.coordinates?.latitude;
    const lon = data.taken?.location?.coordinates?.longitude;
    const hasCoords = lat !== undefined && lat !== null && lon !== undefined && lon !== null;
    const geocoded = data.geocoded;
    return (
      <Body>
        <Preview
          src={`${config.PHOTO_ROOT_URL}display/${data.id}`}
          alt={data.id}
        />
        {error && <ErrorBanner>{error}</ErrorBanner>}
        <Section>
          <SectionTitle>{t("manage-photo-section-content")}</SectionTitle>
          <Field>
            <FieldLabel>{t("manage-photo-field-title")}</FieldLabel>
            <Input
              type="text"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              $highlight={highlight.title}
            />
            {highlight.title && (
              <FieldHint>{t("manage-photo-filter-match-hint")}</FieldHint>
            )}
          </Field>
          <Field>
            <FieldLabel>{t("manage-photo-field-description")}</FieldLabel>
            <TextArea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              $highlight={highlight.description}
            />
            {highlight.description && (
              <FieldHint>{t("manage-photo-filter-match-hint")}</FieldHint>
            )}
          </Field>
          <Field>
            <FieldLabel>{t("manage-photo-field-author")}</FieldLabel>
            <Input
              type="text"
              value={form.author}
              onChange={(e) => setField("author", e.target.value)}
              $highlight={highlight.author}
            />
            {highlight.author && (
              <FieldHint>{t("manage-photo-filter-match-hint")}</FieldHint>
            )}
          </Field>
        </Section>
        <Section>
          <SectionTitle>{t("manage-photo-section-location")}</SectionTitle>
          <FieldRow>
            <Field>
              <FieldLabel>{t("manage-photo-field-country")}</FieldLabel>
              <Input
                type="text"
                value={form.country}
                onChange={(e) => setField("country", e.target.value)}
                placeholder="JP"
                maxLength={2}
                $highlight={highlight.country}
              />
              {highlight.country && (
                <FieldHint>{t("manage-photo-filter-match-hint")}</FieldHint>
              )}
            </Field>
            <Field>
              <FieldLabel>{t("manage-photo-field-place")}</FieldLabel>
              <Input
                type="text"
                value={form.place}
                onChange={(e) => setField("place", e.target.value)}
                $highlight={highlight.place}
              />
              {highlight.place && (
                <FieldHint>{t("manage-photo-filter-match-hint")}</FieldHint>
              )}
            </Field>
          </FieldRow>
        </Section>
        <Section>
          <SectionTitle>{t("manage-photo-section-camera")}</SectionTitle>
          <FieldRow>
            <Field>
              <FieldLabel>{t("manage-photo-field-camera-make")}</FieldLabel>
              <Input
                type="text"
                value={form.cameraMake}
                onChange={(e) => setField("cameraMake", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>{t("manage-photo-field-camera-model")}</FieldLabel>
              <Input
                type="text"
                value={form.cameraModel}
                onChange={(e) => setField("cameraModel", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>{t("manage-photo-field-lens-make")}</FieldLabel>
              <Input
                type="text"
                value={form.lensMake}
                onChange={(e) => setField("lensMake", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>{t("manage-photo-field-lens-model")}</FieldLabel>
              <Input
                type="text"
                value={form.lensModel}
                onChange={(e) => setField("lensModel", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>{t("manage-photo-field-focal")}</FieldLabel>
              <Input
                type="number"
                step="any"
                value={form.focalLength}
                onChange={(e) => setField("focalLength", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>{t("manage-photo-field-aperture")}</FieldLabel>
              <Input
                type="number"
                step="any"
                value={form.aperture}
                onChange={(e) => setField("aperture", e.target.value)}
              />
            </Field>
          </FieldRow>
        </Section>
        <Section>
          <SectionTitle>{t("manage-photo-section-readonly")}</SectionTitle>
          <Field>
            <FieldLabel>{t("manage-photo-field-id")}</FieldLabel>
            <ReadOnly>{data.id}</ReadOnly>
          </Field>
          {data.originalFilename && (
            <Field>
              <FieldLabel>{t("manage-photo-field-original-filename")}</FieldLabel>
              <ReadOnly>{data.originalFilename}</ReadOnly>
            </Field>
          )}
          {data.taken?.instant?.timestamp && (
            <Field>
              <FieldLabel>{t("manage-photo-field-taken")}</FieldLabel>
              <ReadOnly>{data.taken.instant.timestamp}</ReadOnly>
            </Field>
          )}
          {hasCoords && (
            <Field>
              <FieldLabel>{t("manage-photo-field-coords")}</FieldLabel>
              <ReadOnly>{`${lat}, ${lon}`}</ReadOnly>
            </Field>
          )}
          {geocoded?.city && (
            <Field>
              <FieldLabel>{t("manage-photo-field-geocoded")}</FieldLabel>
              <ReadOnly>
                {[geocoded.countryCode, geocoded.state, geocoded.city]
                  .filter(Boolean)
                  .join(" / ")}
              </ReadOnly>
            </Field>
          )}
          {data.exposure?.iso !== undefined && (
            <Field>
              <FieldLabel>{t("manage-photo-field-exposure-extra")}</FieldLabel>
              <ReadOnly>
                {[
                  data.exposure.exposureTime !== undefined
                    ? `${data.exposure.exposureTime}s`
                    : null,
                  data.exposure.iso !== undefined
                    ? `ISO ${data.exposure.iso}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </ReadOnly>
            </Field>
          )}
        </Section>
      </Body>
    );
  };

  return (
    <Drawer>
      <Header>
        <Title>{data?.title || data?.id || id}</Title>
        <CloseButton
          type="button"
          aria-label={String(t("close"))}
          onClick={close}
        >
          <BsX />
        </CloseButton>
      </Header>
      {renderBody()}
      <Footer>
        <ButtonSecondary type="button" onClick={close}>
          {t("manage-photo-button-cancel")}
        </ButtonSecondary>
        <ButtonPrimary
          type="button"
          disabled={!dirty || saving}
          onClick={save}
        >
          {saving
            ? t("manage-photo-button-saving")
            : t("manage-photo-button-save")}
        </ButtonPrimary>
      </Footer>
    </Drawer>
  );
};

export default PhotoDrawer;
