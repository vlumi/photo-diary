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
import { useLangStore } from "../../stores";

// In-flow editor panel — replaces the photos sidebar's filter
// contents when a photo is open. The grid stays clickable so an
// operator can hop between photos; clicking another tile reloads
// this panel with the new photo's data. Close (back to filters)
// happens via Esc, Cancel, or the close button.
const Drawer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
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
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;
// Wraps an EXIF-derived input + the optional revert affordance so
// the input keeps its 100% width and the button slots flush on the
// right.
const InputRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 4px;
`;
const RevertButton = styled.button`
  flex: 0 0 auto;
  padding: 0 8px;
  background: transparent;
  color: var(--inactive-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  &:hover {
    color: var(--primary-color);
  }
`;
const UnlockRow = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px dashed var(--inactive-color);
  border-radius: 4px;
  font-size: 0.85em;
  color: var(--inactive-color);
`;
// Country picker: typeahead-style select using the lang store's
// localised country dictionary (reused from the public viewer's
// flag rendering, no new dependency). Stores the alpha-2 code on
// the form; renders "<flag> Country name (CC)" in the dropdown.
const CountrySelectRoot = styled.div`
  position: relative;
`;
const CountryDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  margin-top: 2px;
  max-height: 240px;
  overflow-y: auto;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
`;
const CountryOption = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  background: ${({ $active }) =>
    $active ? "var(--header-background)" : "transparent"};
  color: ${({ $active }) =>
    $active ? "var(--header-color)" : "var(--primary-color)"};
  border: none;
  text-align: left;
  font: inherit;
  font-size: 0.9em;
  cursor: pointer;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
  }
`;
const CountryCode = styled.span`
  margin-left: auto;
  font-family: monospace;
  font-size: 0.85em;
  color: var(--inactive-color);
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
// MetadataPanel-style 2-col label/value grid for the read-only
// section: small uppercase labels, muted values, long entries wrap
// inside the value cell so they don't push the panel wider.
const MetaTable = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 10px;
  row-gap: 4px;
`;
const MetaLabel = styled.div`
  font-size: 0.7em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--inactive-color);
  padding-top: 2px;
  text-align: right;
  white-space: nowrap;
`;
const MetaValue = styled.div`
  font-size: 0.85em;
  color: var(--inactive-color);
  line-height: 1.4;
  text-align: left;
  word-break: break-word;
  min-width: 0;
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
    focalLength35mmEquiv?: number;
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
  // EXIF snapshot captured at converter intake (#416). Undefined on
  // rows that pre-date migration 014. Drives the per-field revert
  // affordance and the "no backup" gate on EXIF-derived inputs.
  exifAtIntake?: {
    taken?: {
      author?: string;
      location?: {
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
      focalLength35mmEquiv?: number;
      aperture?: number;
    };
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
  latitude: string;
  longitude: string;
  altitude: string;
  cameraMake: string;
  cameraModel: string;
  lensMake: string;
  lensModel: string;
  focalLength: string;
  focalLength35mmEquiv: string;
  aperture: string;
}

const emptyForm = (): FormState => ({
  title: "",
  description: "",
  author: "",
  country: "",
  place: "",
  latitude: "",
  longitude: "",
  altitude: "",
  cameraMake: "",
  cameraModel: "",
  lensMake: "",
  lensModel: "",
  focalLength: "",
  focalLength35mmEquiv: "",
  aperture: "",
});

const numField = (v: number | null | undefined): string =>
  v !== undefined && v !== null ? String(v) : "";

const formFrom = (p: PhotoData): FormState => ({
  title: p.title ?? "",
  description: p.description ?? "",
  author: p.taken?.author ?? "",
  country: p.taken?.location?.country ?? "",
  place: p.taken?.location?.place ?? "",
  latitude: numField(p.taken?.location?.coordinates?.latitude),
  longitude: numField(p.taken?.location?.coordinates?.longitude),
  altitude: numField(p.taken?.location?.coordinates?.altitude),
  cameraMake: p.camera?.make ?? "",
  cameraModel: p.camera?.model ?? "",
  lensMake: p.lens?.make ?? "",
  lensModel: p.lens?.model ?? "",
  focalLength: numField(p.exposure?.focalLength),
  focalLength35mmEquiv: numField(p.exposure?.focalLength35mmEquiv),
  aperture: numField(p.exposure?.aperture),
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
  // Coordinates: empty → null (clears the field server-side),
  // valid number → parsed, invalid → skip.
  const coordPatch = (
    cur: string,
    orig: string
  ): number | null | undefined => {
    if (cur.trim() === orig.trim()) return undefined;
    if (cur.trim() === "") return null;
    const v = parseFloat(cur);
    return Number.isNaN(v) ? undefined : v;
  };
  const coordinates: NonNullable<
    NonNullable<
      NonNullable<PhotoUpdatePatch["taken"]>["location"]
    >["coordinates"]
  > = {};
  const lat = coordPatch(current.latitude, original.latitude);
  if (lat !== undefined) coordinates.latitude = lat;
  const lon = coordPatch(current.longitude, original.longitude);
  if (lon !== undefined) coordinates.longitude = lon;
  const alt = coordPatch(current.altitude, original.altitude);
  if (alt !== undefined) coordinates.altitude = alt;
  if (Object.keys(coordinates).length > 0) {
    takenLocation.coordinates = coordinates;
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
  if (
    current.focalLength35mmEquiv.trim() !==
    original.focalLength35mmEquiv.trim()
  ) {
    const v = parseFloat(current.focalLength35mmEquiv);
    if (!Number.isNaN(v)) exposure.focalLength35mmEquiv = v;
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

// Inline typeahead for the country field. Reuses the lang store's
// `countryData` (the same i18n-iso-countries instance the public
// viewer uses for flag rendering) — no extra network call, no new
// dependency. Stores the alpha-2 code on the form; the dropdown
// renders localised names. Empty filter shows all countries
// alphabetised; typing narrows.
interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  highlight?: boolean;
  disabled?: boolean;
}
const CountrySelect = ({
  value,
  onChange,
  highlight,
  disabled,
}: CountrySelectProps): React.ReactElement => {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const countryData = useLangStore((s) => s.countryData);
  const [filter, setFilter] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const names = React.useMemo(() => {
    if (!countryData) return {} as Record<string, string>;
    return countryData.getNames(lang) as Record<string, string>;
  }, [countryData, lang]);

  const matches = React.useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const entries = Object.entries(names).map(([code, name]) => ({
      code: code.toLowerCase(),
      name,
    }));
    entries.sort((a, b) => a.name.localeCompare(b.name));
    if (!needle) return entries;
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(needle) ||
        e.code.toLowerCase().includes(needle)
    );
  }, [names, filter]);

  const display = React.useMemo(() => {
    if (!value) return "";
    const upper = value.toUpperCase();
    const name = names[upper];
    return name ? `${name} (${upper.toUpperCase()})` : upper.toUpperCase();
  }, [value, names]);

  const choose = (code: string) => {
    onChange(code);
    setFilter("");
    setOpen(false);
  };

  return (
    <CountrySelectRoot ref={rootRef}>
      <Input
        type="text"
        value={open ? filter : display}
        placeholder={String(t("manage-photo-country-filter-placeholder"))}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setFilter(e.target.value);
          if (!open) setOpen(true);
        }}
        $highlight={!!highlight}
        disabled={disabled}
      />
      {open && (
        <CountryDropdown role="listbox">
          {value && (
            <CountryOption
              type="button"
              $active={false}
              onClick={() => choose("")}
              title={String(t("manage-photo-country-clear"))}
            >
              <span>—</span>
              <span>{t("manage-photo-country-clear")}</span>
            </CountryOption>
          )}
          {matches.length === 0 && (
            <CountryOption type="button" $active={false} disabled>
              <span>{t("manage-photo-country-no-match")}</span>
            </CountryOption>
          )}
          {matches.map((entry) => {
            const codeUpper = entry.code.toUpperCase();
            const selected =
              value && value.toUpperCase() === codeUpper;
            return (
              <CountryOption
                key={entry.code}
                type="button"
                $active={!!selected}
                onClick={() => choose(entry.code)}
              >
                <span>{entry.name}</span>
                <CountryCode>{codeUpper}</CountryCode>
              </CountryOption>
            );
          })}
        </CountryDropdown>
      )}
    </CountrySelectRoot>
  );
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
  // Per-photo unlock toggle for EXIF-derived fields when the photo
  // has no `exifAtIntake` blob (#416). Resets when the open photo
  // changes — the operator must consciously re-acknowledge "no
  // backup" on each row.
  const [unlocked, setUnlocked] = React.useState(false);

  React.useEffect(() => {
    if (data) {
      const f = formFrom(data);
      setForm(f);
      setOriginal(f);
      setError(null);
      setUnlocked(false);
    }
  }, [data, id]);

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
    coords:
      missingActive.has("coords") &&
      (!original.latitude || !original.longitude),
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

  // The form-state keys that came from EXIF originally. The drawer
  // gates these behind an unlock when `exifAtIntake` is missing,
  // and shows a per-field revert when the blob has a value to
  // revert *to*. Operator-only fields (title, description, country
  // override, place) are not in this set.
  type ExifKey =
    | "author"
    | "latitude"
    | "longitude"
    | "altitude"
    | "cameraMake"
    | "cameraModel"
    | "lensMake"
    | "lensModel"
    | "focalLength"
    | "focalLength35mmEquiv"
    | "aperture";
  const exifValueFor = (key: ExifKey): string | undefined => {
    const blob = data?.exifAtIntake;
    if (!blob) return undefined;
    const num = (v: number | null | undefined): string | undefined =>
      v === undefined || v === null ? undefined : String(v);
    switch (key) {
      case "author":
        return blob.taken?.author;
      case "latitude":
        return num(blob.taken?.location?.coordinates?.latitude);
      case "longitude":
        return num(blob.taken?.location?.coordinates?.longitude);
      case "altitude":
        return num(blob.taken?.location?.coordinates?.altitude);
      case "cameraMake":
        return blob.camera?.make;
      case "cameraModel":
        return blob.camera?.model;
      case "lensMake":
        return blob.lens?.make;
      case "lensModel":
        return blob.lens?.model;
      case "focalLength":
        return num(blob.exposure?.focalLength);
      case "focalLength35mmEquiv":
        return num(blob.exposure?.focalLength35mmEquiv);
      case "aperture":
        return num(blob.exposure?.aperture);
    }
  };
  const hasBlob = !!data?.exifAtIntake;
  const exifDisabled = !hasBlob && !unlocked;
  // Returns the EXIF value to revert to, or undefined when there's
  // nothing to revert (no blob / no value for this field).
  const revertableFor = (key: ExifKey): string | undefined => {
    const exif = exifValueFor(key);
    if (exif === undefined) return undefined;
    if (form[key].trim() === exif.trim()) return undefined;
    return exif;
  };
  // Renders an EXIF-derived input + the matching revert button when
  // a blob value is available. Caller passes the form key and any
  // input attributes (type, step, placeholder, $highlight…).
  const renderExifInput = (
    key: ExifKey,
    extra: Omit<
      React.ComponentProps<typeof Input>,
      "value" | "onChange" | "disabled"
    > = {}
  ): React.ReactElement => {
    const revertTo = revertableFor(key);
    return (
      <InputRow>
        <Input
          {...extra}
          value={form[key]}
          onChange={(e) => setField(key, e.target.value)}
          disabled={exifDisabled}
        />
        {revertTo !== undefined && (
          <RevertButton
            type="button"
            title={`${t("manage-photo-revert-to-exif")}: ${revertTo}`}
            onClick={() => setField(key, revertTo)}
            disabled={exifDisabled}
          >
            ↺
          </RevertButton>
        )}
      </InputRow>
    );
  };

  const renderBody = () => {
    if (isLoading) return <Body>{t("loading")}</Body>;
    if (isError || !data) {
      return <Body>{t("manage-photo-load-error")}</Body>;
    }
    const geocoded = data.geocoded;
    return (
      <Body>
        <Preview
          src={`${config.PHOTO_ROOT_URL}display/${data.id}`}
          alt={data.id}
        />
        {error && <ErrorBanner>{error}</ErrorBanner>}
        {!hasBlob && (
          <UnlockRow>
            <input
              type="checkbox"
              checked={unlocked}
              onChange={(e) => setUnlocked(e.target.checked)}
            />
            <span>{t("manage-photo-unlock-exif")}</span>
          </UnlockRow>
        )}
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
            {renderExifInput("author", {
              type: "text",
              $highlight: highlight.author,
            })}
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
              <CountrySelect
                value={form.country}
                onChange={(code) => setField("country", code)}
                highlight={highlight.country}
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
          <FieldRow>
            <Field>
              <FieldLabel>{t("manage-photo-field-latitude")}</FieldLabel>
              {renderExifInput("latitude", {
                type: "number",
                step: "any",
                inputMode: "decimal",
                $highlight: highlight.coords,
              })}
            </Field>
            <Field>
              <FieldLabel>{t("manage-photo-field-longitude")}</FieldLabel>
              {renderExifInput("longitude", {
                type: "number",
                step: "any",
                inputMode: "decimal",
                $highlight: highlight.coords,
              })}
            </Field>
            <Field>
              <FieldLabel>{t("manage-photo-field-altitude")}</FieldLabel>
              {renderExifInput("altitude", {
                type: "number",
                step: "any",
                inputMode: "decimal",
              })}
            </Field>
          </FieldRow>
          {highlight.coords && (
            <FieldHint>{t("manage-photo-filter-match-hint")}</FieldHint>
          )}
          <FieldHint>{t("manage-photo-coord-hint")}</FieldHint>
        </Section>
        <Section>
          <SectionTitle>{t("manage-photo-section-camera")}</SectionTitle>
          <FieldRow>
            <Field>
              <FieldLabel>{t("manage-photo-field-camera-make")}</FieldLabel>
              {renderExifInput("cameraMake", { type: "text" })}
            </Field>
            <Field>
              <FieldLabel>{t("manage-photo-field-camera-model")}</FieldLabel>
              {renderExifInput("cameraModel", { type: "text" })}
            </Field>
            <Field>
              <FieldLabel>{t("manage-photo-field-lens-make")}</FieldLabel>
              {renderExifInput("lensMake", { type: "text" })}
            </Field>
            <Field>
              <FieldLabel>{t("manage-photo-field-lens-model")}</FieldLabel>
              {renderExifInput("lensModel", { type: "text" })}
            </Field>
            <Field>
              <FieldLabel>{t("manage-photo-field-focal")}</FieldLabel>
              {renderExifInput("focalLength", {
                type: "number",
                step: "any",
              })}
            </Field>
            <Field>
              <FieldLabel>{t("manage-photo-field-focal-35mm")}</FieldLabel>
              {renderExifInput("focalLength35mmEquiv", {
                type: "number",
                step: "any",
              })}
            </Field>
            <Field>
              <FieldLabel>{t("manage-photo-field-aperture")}</FieldLabel>
              {renderExifInput("aperture", {
                type: "number",
                step: "any",
              })}
            </Field>
          </FieldRow>
        </Section>
        <Section>
          <SectionTitle>{t("manage-photo-section-readonly")}</SectionTitle>
          <MetaTable>
            <MetaLabel>{t("manage-photo-field-id")}</MetaLabel>
            <MetaValue>{data.id}</MetaValue>
            {data.originalFilename && (
              <>
                <MetaLabel>{t("manage-photo-field-original-filename")}</MetaLabel>
                <MetaValue>{data.originalFilename}</MetaValue>
              </>
            )}
            {data.taken?.instant?.timestamp && (
              <>
                <MetaLabel>{t("manage-photo-field-taken")}</MetaLabel>
                <MetaValue>{data.taken.instant.timestamp}</MetaValue>
              </>
            )}
            {geocoded?.city && (
              <>
                <MetaLabel>{t("manage-photo-field-geocoded")}</MetaLabel>
                <MetaValue>
                  {[geocoded.countryCode, geocoded.state, geocoded.city]
                    .filter(Boolean)
                    .join(" / ")}
                </MetaValue>
              </>
            )}
            {data.exposure?.iso !== undefined && (
              <>
                <MetaLabel>{t("manage-photo-field-exposure-extra")}</MetaLabel>
                <MetaValue>
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
                </MetaValue>
              </>
            )}
          </MetaTable>
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
