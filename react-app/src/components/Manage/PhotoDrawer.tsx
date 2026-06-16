import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  BsArrowClockwise,
  BsBookmarkStar,
  BsBoxArrowUpRight,
  BsCaretLeftFill,
  BsCaretRightFill,
  BsClipboard,
  BsClipboardCheck,
  BsEyeSlashFill,
  BsPencilSquare,
  BsXLg,
} from "react-icons/bs";

import ItemModal, { useModalDirty } from "./ItemModal";
import { Section, SectionTitle } from "./Section";
import {
  filterFromSearchParams,
  pageFromSearchParams,
  PAGE_SIZE,
} from "./Photos";
import galleriesService from "../../services/galleries";
import metaService from "../../services/meta";
import photosService, {
  type MissingField,
  type PhotoUpdatePatch,
} from "../../services/photos";
import config from "../../lib/config";
import { isCountrySentinel } from "../../lib/country-sentinel";
import { ensureAllCountryLocales, useLangStore } from "../../stores";
import CountrySelect from "./CountrySelect";
import EditableMap from "./EditableMap.lazy";
import LocalizedInputs, {
  LocalizedReadout,
  SUPPORTED_LANGS,
} from "./LocalizedInputs";

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
  box-sizing: border-box;
  /* No overflow:hidden — the sticky Header/Footer below need a
     scrolling ancestor without a clipping context between them.
     Routed mode scrolls at ItemModal.Body; inline mode scrolls at
     the inner Body (which has its own overflow-y: auto). */
  min-height: 0;
  flex: 1 1 auto;
`;
const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--inactive-color);
  flex: 0 0 auto;
  position: sticky;
  top: 0;
  background: var(--primary-background);
  z-index: 2;
`;
const Title = styled.div`
  font-weight: bold;
  font-size: 0.95em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1 1 auto;
  min-width: 0;
  text-align: center;
`;
const HeaderIconButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  font-size: 1.1em;
  cursor: pointer;
  text-decoration: none;
  padding: 4px;
  background: none;
  border: none;
  font: inherit;
  &:hover {
    color: var(--inactive-color);
  }
  &[aria-disabled="true"] {
    opacity: 0.4;
    pointer-events: none;
  }
`;
const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
`;
const Body = styled.div`
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
`;
const Preview = styled.img`
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  background: var(--tile-background);
  border-radius: 2px;
`;
const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
const FieldRow = styled.div`
  display: grid;
  /* auto-fit lets the modal pack as many columns as fit at the
     current width — 2-col on narrow screens, 3+ on wide modals. */
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
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
// Overview panel doubles as the photo's visual identity at the top
// of the drawer — the largest rendition acts as a hero preview on
// the left, with renditions / galleries / privacy listed on the
// right as compact rows. Saves a couple of two-row Sections worth
// of chrome at the cost of nesting.
const RenditionRowLayout = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-start;
`;
const OverviewMeta = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`;
const OverviewMetaRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
const OverviewMetaLabel = styled.span`
  font-size: 0.75em;
  color: var(--inactive-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;
const OverviewMetaValue = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`;
const RenditionHero = styled.a`
  flex: 0 0 auto;
  display: block;
  text-decoration: none;
`;
const RenditionHeroImg = styled.img`
  width: 180px;
  height: 180px;
  object-fit: contain;
  background: var(--tile-background);
  border-radius: 4px;
  border: 1px solid var(--inactive-color);
`;
const RenditionChips = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-content: flex-start;
`;
const RenditionChip = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--inactive-color);
  border-radius: 999px;
  background: var(--primary-background);
  color: var(--primary-color);
  text-decoration: none;
  font-size: 0.85em;
  &:hover {
    background: var(--tile-background);
  }
`;
const MetaValueRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;
const GalleryChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;
const GalleryChip = styled.div`
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--inactive-color);
  border-radius: 12px;
  overflow: hidden;
  font-size: 0.85em;
  background: transparent;
`;
const GalleryChipPrimary = styled.a`
  padding: 2px 8px;
  color: var(--primary-color);
  text-decoration: none;
  cursor: pointer;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
  }
`;
const GalleryChipSecondary = styled.a`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-left: 1px solid var(--inactive-color);
  color: var(--inactive-color);
  cursor: pointer;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
  }
`;
const InlineActionButton = styled.button`
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: transparent;
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 10px;
  font-size: 0.75em;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
    border-color: var(--header-background);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
const CopyIconButton = styled.button`
  font: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  margin-left: 6px;
  background: transparent;
  color: var(--inactive-color);
  border: none;
  border-radius: 3px;
  font-size: 0.85em;
  cursor: pointer;
  vertical-align: middle;
  &:hover {
    color: var(--primary-color);
  }
  &:focus-visible {
    outline: 1px solid var(--primary-color);
    outline-offset: 1px;
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
const EmptyValue = styled.span`
  font-style: italic;
`;
const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--inactive-color);
  flex: 0 0 auto;
  position: sticky;
  bottom: 0;
  background: var(--primary-background);
  z-index: 2;
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
  titleLocalized?: Record<string, string>;
  descriptionLocalized?: Record<string, string>;
  originalFilename?: string;
  taken?: {
    author?: string;
    instant?: { timestamp?: string };
    location?: {
      country?: string;
      place?: string;
      placeLocalized?: Record<string, string>;
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
    // Verbatim Nominatim address blob — used to surface maritime
    // names (`ocean`, `sea`, `bay`, `strait`, `gulf`) when no city
    // applies, e.g. photos taken in international waters.
    address?: Record<string, unknown>;
    // True if `markGeocodeNoData` ran (geocoder ran and reported
    // nothing). Distinguishes "no data here" from "daemon hasn't
    // gotten to this row yet" — both have empty city / countryCode
    // otherwise.
    noData?: boolean;
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
      exposureTime?: number;
      iso?: number;
    };
  };
  // Gallery ids the photo is linked to. Decorated server-side by
  // `getPhoto` / `listPhotos` so the drawer can render jump-link
  // chips into `/g/<gallery>/<photoId>` or `/m/galleries/<id>`.
  galleries?: string[];
  // Photo-level visibility (#480) — flipped by the privacy switch
  // in this drawer; surfaces the badge on the public Photo modal.
  isPrivate?: boolean;
  // Display ladder per #615 — array of maxDim values the converter
  // (and bin/photo-rerender.ts) registered for this photo.
  renditions?: number[];
}

// Maritime address keys Nominatim emits when reverse-geocoding
// open water. Falling back to the first populated one lets the
// drawer show "Atlantic Ocean" / "Gulf of Finland" for photos
// taken on the water, instead of "Not geocoded yet".
const MARITIME_ADDRESS_KEYS = [
  "ocean",
  "sea",
  "bay",
  "strait",
  "gulf",
] as const;

// Render the geocoded-row summary as one of four states:
//  1. city set → existing `countryCode / state / city` join
//  2. maritime field set → that name verbatim
//  3. noData = true → "no data" empty-state
//  4. otherwise → existing "not geocoded yet" empty-state
const renderGeocodedSummary = (
  geocoded:
    | {
        countryCode?: string;
        state?: string;
        city?: string;
        address?: Record<string, unknown>;
        noData?: boolean;
      }
    | undefined,
  t: (key: string) => string
): React.ReactNode => {
  if (geocoded?.city) {
    return [geocoded.countryCode, geocoded.state, geocoded.city]
      .filter(Boolean)
      .join(" / ");
  }
  const address = geocoded?.address ?? {};
  for (const key of MARITIME_ADDRESS_KEYS) {
    const value = address[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return (
    <EmptyValue>
      {t(
        geocoded?.noData
          ? "manage-photo-geocoded-no-data"
          : "manage-photo-geocoded-empty"
      )}
    </EmptyValue>
  );
};

// Small inline copy-to-clipboard button used in the read-only meta
// rows (id, original filename). Falls back to hidden when the
// clipboard API isn't available (non-HTTPS dev origins). Flashes
// a check icon for 1.5s after a successful copy so the operator
// sees the action register without needing a separate toast.
const CopyButton = ({
  value,
  label,
}: {
  value: string;
  label: string;
}): React.ReactElement | null => {
  const [copied, setCopied] = React.useState(false);
  const hasClipboard =
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.writeText === "function";
  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  if (!hasClipboard) return null;
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(value).then(
      () => setCopied(true),
      () => undefined
    );
  };
  return (
    <CopyIconButton
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {copied ? <BsClipboardCheck aria-hidden /> : <BsClipboard aria-hidden />}
    </CopyIconButton>
  );
};

// Editable subset of the photo — mirrors the server's PhotoUpdateBody
// schema. EXIF / geocoded fields stay read-only.
interface FormState {
  title: string;
  description: string;
  titleLocalized: Record<string, string>;
  descriptionLocalized: Record<string, string>;
  placeLocalized: Record<string, string>;
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
  exposureTime: string;
  iso: string;
  isPrivate: boolean;
}

const emptyLocalized = (): Record<string, string> =>
  Object.fromEntries(SUPPORTED_LANGS.map((l) => [l, ""]));

const emptyForm = (): FormState => ({
  title: "",
  description: "",
  titleLocalized: emptyLocalized(),
  descriptionLocalized: emptyLocalized(),
  placeLocalized: emptyLocalized(),
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
  exposureTime: "",
  iso: "",
  isPrivate: false,
});

const numField = (v: number | null | undefined): string =>
  v !== undefined && v !== null ? String(v) : "";

// Accept either decimal seconds ("0.008") or photographer-friendly
// fractions ("1/125") in the exposure-time field. Empty string and
// nonsense return null so toPatch can skip the field.
const parseExposureTime = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fraction = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(trimmed);
  if (fraction) {
    const num = parseFloat(fraction[1]);
    const den = parseFloat(fraction[2]);
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return num / den;
    }
  }
  const direct = parseFloat(trimmed);
  return Number.isFinite(direct) ? direct : null;
};

// Photographer-friendly form-input representation: fractions for
// sub-second exposures ("1/125"), bare seconds for slower ("2.5").
// `formatExposureTime` adds the trailing "s" for view-mode display.
const formatExposureTimeForInput = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds >= 1) return String(seconds);
  return `1/${Math.round(1 / seconds)}`;
};
const formatExposureTime = (seconds: number): string => {
  const inputForm = formatExposureTimeForInput(seconds);
  return inputForm ? `${inputForm}s` : "";
};

const localizedFrom = (
  map: Record<string, string> | undefined
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const lang of SUPPORTED_LANGS) out[lang] = map?.[lang] ?? "";
  return out;
};

const formFrom = (p: PhotoData): FormState => ({
  title: p.title ?? "",
  description: p.description ?? "",
  titleLocalized: localizedFrom(p.titleLocalized),
  descriptionLocalized: localizedFrom(p.descriptionLocalized),
  placeLocalized: localizedFrom(p.taken?.location?.placeLocalized),
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
  exposureTime:
    p.exposure?.exposureTime !== undefined && p.exposure.exposureTime !== null
      ? formatExposureTimeForInput(p.exposure.exposureTime)
      : "",
  iso: numField(p.exposure?.iso),
  isPrivate: !!p.isPrivate,
});

// Diff per-language overlay maps. Returns only the entries the user
// touched; empty string in any entry forwards as-is so the server
// clears that column (NULL in the row). Unchanged entries are dropped.
const localizedPatch = (
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
  const titleLocPatch = localizedPatch(
    original.titleLocalized,
    current.titleLocalized
  );
  if (titleLocPatch) patch.titleLocalized = titleLocPatch;
  const descLocPatch = localizedPatch(
    original.descriptionLocalized,
    current.descriptionLocalized
  );
  if (descLocPatch) patch.descriptionLocalized = descLocPatch;
  const takenLocation: NonNullable<
    NonNullable<PhotoUpdatePatch["taken"]>["location"]
  > = {};
  if (trim(current.country) !== trim(original.country)) {
    takenLocation.country = trim(current.country);
  }
  if (trim(current.place) !== trim(original.place)) {
    takenLocation.place = trim(current.place);
  }
  const placeLocPatch = localizedPatch(
    original.placeLocalized,
    current.placeLocalized
  );
  if (placeLocPatch) takenLocation.placeLocalized = placeLocPatch;
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
  if (current.exposureTime.trim() !== original.exposureTime.trim()) {
    const v = parseExposureTime(current.exposureTime);
    if (v !== null) exposure.exposureTime = v;
  }
  if (current.iso.trim() !== original.iso.trim()) {
    const v = parseFloat(current.iso);
    if (!Number.isNaN(v)) exposure.iso = v;
  }
  if (Object.keys(exposure).length > 0) patch.exposure = exposure;
  if (current.isPrivate !== original.isPrivate) {
    patch.isPrivate = current.isPrivate;
  }
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


interface PhotoDrawerProps {
  // Photo id to load + edit. Required.
  photoId: string;
  // Gallery context for the "View in gallery" link, the icon
  // affordance, and any future per-gallery defaults. Optional —
  // the routed mount lifts it from `?gallery=`; the in-place
  // modal in the public Photo view passes it directly.
  galleryId?: string;
  // Called when the drawer wants to dismiss itself (Esc, the
  // header × button, or Cancel). Routed mount strips the
  // `/<photoId>` segment from the pathname; the in-place modal
  // closes the overlay without navigating away from `/g/`.
  onClose: () => void;
  // `?missing=…` chip highlighting — only the routed (admin)
  // mount carries this URL state. The in-place modal omits it.
  missingActive?: Set<MissingField>;
  // `inline`: opened over the public Photo view; the header
  // surfaces an "Open in Manage" link to jump to /m/photos.
  // `routed`: already at /m/photos/<id>; header offers the
  // sibling "View on site" link instead.
  mode?: "inline" | "routed";
  // Routed-mode prev/next neighbours from the cached photos list.
  // Drives the Header arrows + ← / → keyboard nav. Either may be
  // undefined when at the start/end of the result page.
  prevPhotoId?: string;
  nextPhotoId?: string;
}

const PhotoDrawer = ({
  photoId,
  galleryId,
  onClose,
  missingActive: missingActiveProp,
  mode = "routed",
  prevPhotoId,
  nextPhotoId,
}: PhotoDrawerProps): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const id = photoId;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["manage-photo", id],
    queryFn: () => photosService.get(id) as Promise<PhotoData>,
    // Keep the previous drawer's data painted while a different
    // photo's row is opened — the parent grid stays put thanks to
    // keepPreviousData on `manage-photos`, and the drawer mirroring
    // that keeps the transition smooth instead of flashing "loading"
    // mid-swap (#574).
    placeholderData: keepPreviousData,
  });

  // Galleries fetched once for the whole drawer to resolve the
  // `Galleries` meta row chips into nice titles (the photo
  // response only carries gallery ids). Shared cache key with
  // Photos.tsx so this is usually already populated.
  const galleriesQuery = useQuery({
    queryKey: ["galleries"],
    queryFn: galleriesService.getAll,
  });
  // Instance default language drives which lang the canonical column
  // is treated as. Photos can be in multiple galleries with different
  // `default_language` values, so there's no single per-photo answer;
  // the instance default is the safest bet — the operator's typical
  // working language at the deployment level. The matching overlay
  // row is then hidden on each Localized field (canonical input
  // carries that language).
  const metaQuery = useQuery({
    queryKey: ["meta"],
    queryFn: () => metaService.getAll(),
  });
  const primaryLang =
    ((metaQuery.data as { defaultLanguage?: string } | undefined)
      ?.defaultLanguage as string | undefined) ?? "en";
  const galleryById = React.useMemo(() => {
    const map = new Map<string, { id: string; title?: string }>();
    const rows = galleriesQuery.data as
      | Array<{ id: string; title?: string }>
      | undefined;
    for (const g of rows ?? []) map.set(g.id, g);
    return map;
  }, [galleriesQuery.data]);

  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [original, setOriginal] = React.useState<FormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Country-name readout shows the active country across every
  // supported language — preload all locale dictionaries on mount so
  // the labels resolve immediately when the country dropdown changes.
  const countryData = useLangStore((s) => s.countryData);
  React.useEffect(() => {
    void ensureAllCountryLocales();
  }, []);
  const countryNameFor = (lang: string): string | undefined => {
    const code = form.country;
    if (!code) return undefined;
    if (isCountrySentinel(code)) {
      // i18next has every supported language's resources loaded at
      // module init (en / fi / ja are bundled, not async); the
      // explicit `lng` option pulls the right translation regardless
      // of the active UI language.
      return String(t("country-sentinel-label", { lng: lang }));
    }
    if (!countryData) return undefined;
    return (
      countryData.getName(code, lang, { select: "alias" }) ||
      countryData.getName(code, lang) ||
      undefined
    );
  };
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

  // (`close` + the inline-mode Esc listener are defined below
  //  `dirty` so the confirm check reads the current dirty state.)

  const missingActive = missingActiveProp ?? new Set<MissingField>();
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

  // Propagate dirty up to the surrounding ItemModal (routed mode)
  // so X / backdrop / Esc go through the same confirm-discard
  // prompt as the other Manage modals. No-op when the modal
  // context isn't mounted (inline mode handles dirty locally
  // inside `close`).
  useModalDirty(dirty);

  const close = React.useCallback(() => {
    // Routed-mode `onClose` is ItemModal's own `safeNavigate`,
    // which already prompts when the body is dirty (via the
    // useModalDirty hook above). Inline mode's `onClose` is a
    // raw setState callback in /g/'s Photo modal — confirm here
    // so a stray Esc doesn't quietly drop unsaved edits.
    if (mode === "inline" && dirty) {
      const ok = window.confirm(String(t("manage-modal-confirm-discard")));
      if (!ok) return;
    }
    onClose();
  }, [onClose, mode, dirty, t]);

  // Inline-mode Esc listener (routed mode delegates to ItemModal,
  // which uses the dirty flag posted via useModalDirty above).
  // Capture phase + stopImmediatePropagation keeps the outer Photo
  // / Month listeners from also firing.
  React.useEffect(() => {
    if (mode === "routed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [close, mode]);

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
        queryClient.invalidateQueries({ queryKey: ["manage-audit-counts"] }),
        queryClient.invalidateQueries({
          queryKey: ["manage-photos-year-months"],
        }),
      ]);
    } catch (e) {
      setError((e as Error).message || t("manage-photo-save-error"));
    } finally {
      setSaving(false);
    }
  };

  // Fire the regeocode endpoint and refresh the photo so the
  // cleared (and shortly re-fetched, if the daemon is up)
  // geocoded fields show through. The Nominatim fetch is async
  // on the converter side; the immediate visible effect is the
  // geocoded section going blank.
  const regeocodeMutation = useMutation({
    mutationFn: () => photosService.regeocode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-photo", id] });
      queryClient.invalidateQueries({ queryKey: ["manage-photos"] });
      queryClient.invalidateQueries({ queryKey: ["manage-audit-counts"] });
    },
    onError: (e: Error) => {
      setError(e.message || t("manage-photo-save-error"));
    },
  });

  const setField = <K extends keyof FormState>(key: K, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const setLocalizedField = (
    key: "titleLocalized" | "descriptionLocalized" | "placeLocalized",
    lang: string,
    value: string
  ) =>
    setForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], [lang]: value },
    }));

  // The form-state keys that came from EXIF originally. The drawer
  // gates these behind an unlock when `exifAtIntake` is missing,
  // and shows a per-field revert when the blob has a value to
  // revert *to*. Operator-only fields (title, description, country
  // override, place) are not in this set.
  const EXIF_KEYS = [
    "author",
    "latitude",
    "longitude",
    "altitude",
    "cameraMake",
    "cameraModel",
    "lensMake",
    "lensModel",
    "focalLength",
    "focalLength35mmEquiv",
    "aperture",
    "exposureTime",
    "iso",
  ] as const;
  type ExifKey = (typeof EXIF_KEYS)[number];
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
      case "exposureTime": {
        const v = blob.exposure?.exposureTime;
        return v === undefined || v === null
          ? undefined
          : formatExposureTimeForInput(v);
      }
      case "iso":
        return num(blob.exposure?.iso);
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
        {error && <ErrorBanner>{error}</ErrorBanner>}
        {!hasBlob && (
          <UnlockRow>
            <input
              type="checkbox"
              checked={unlocked}
              onChange={(e) => {
                const next = e.target.checked;
                setUnlocked(next);
                // Re-locking reverts any pending EXIF-derived edits
                // back to `original`. The operator sees in the
                // (now-disabled) inputs exactly what will be sent
                // on Save — no ambiguity between visible-but-not-
                // saved values vs values held under the lock.
                if (!next) {
                  setForm((prev) => {
                    const reverted = { ...prev };
                    for (const key of EXIF_KEYS) {
                      reverted[key] = original[key];
                    }
                    return reverted;
                  });
                }
              }}
            />
            <span>{t("manage-photo-unlock-exif")}</span>
          </UnlockRow>
        )}
        <Section>
          <SectionTitle>{t("manage-photo-section-overview")}</SectionTitle>
          {(() => {
            const renditions = (data?.renditions ?? []) as number[];
            const sorted = [...renditions].sort((a, b) => a - b);
            // Thumbnail URL doubles as the hero — it always exists
            // (one-off per photo, not part of the rendition ladder),
            // so the panel works even on instances that haven't run
            // bin/photo-rerender.ts to populate the display ladder
            // yet. Clicking opens the largest registered rendition.
            const thumbUrl = `${config.PHOTO_ROOT_URL}thumbnail/${data.id}`;
            const largest =
              sorted.length > 0 ? sorted[sorted.length - 1] : null;
            const heroHref =
              largest !== null
                ? `${config.PHOTO_ROOT_URL}display/${largest}/${data.id}`
                : thumbUrl;
            return (
              <RenditionRowLayout>
                <RenditionHero
                  href={heroHref}
                  target="_blank"
                  rel="noreferrer"
                  title={largest !== null ? `${largest} px` : undefined}
                >
                  <RenditionHeroImg src={thumbUrl} alt={data.id} />
                </RenditionHero>
                <OverviewMeta>
                  <OverviewMetaRow>
                    <OverviewMetaLabel>
                      {t("manage-photo-field-renditions")}
                    </OverviewMetaLabel>
                    <OverviewMetaValue>
                      {sorted.length === 0 ? (
                        <EmptyValue>
                          {t("manage-photo-renditions-empty")}
                        </EmptyValue>
                      ) : (
                        <RenditionChips>
                          {sorted.map((dim) => {
                            const url = `${config.PHOTO_ROOT_URL}display/${dim}/${data.id}`;
                            return (
                              <RenditionChip
                                key={dim}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {dim} px
                              </RenditionChip>
                            );
                          })}
                        </RenditionChips>
                      )}
                    </OverviewMetaValue>
                  </OverviewMetaRow>
                  <OverviewMetaRow>
                    <OverviewMetaLabel>
                      {t("manage-photo-field-galleries")}
                    </OverviewMetaLabel>
                    <OverviewMetaValue>
                      {data.galleries && data.galleries.length > 0 ? (
                        <GalleryChipRow>
                          {data.galleries.map((gid) => {
                            const meta = galleryById.get(gid);
                            const label = meta?.title || gid;
                            const ts = data.taken?.instant?.timestamp;
                            const ymd =
                              ts && /^\d{4}-\d{2}-\d{2}/.test(ts)
                                ? [
                                    Number(ts.slice(0, 4)),
                                    Number(ts.slice(5, 7)),
                                    Number(ts.slice(8, 10)),
                                  ]
                                : null;
                            const viewHref = ymd
                              ? `/g/${gid}/${ymd[0]}/${ymd[1]}/${ymd[2]}/${data.id}`
                              : `/g/${gid}`;
                            const editHref = `/m/g/${gid}`;
                            return (
                              <GalleryChip key={gid}>
                                <GalleryChipPrimary
                                  href={viewHref}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(viewHref);
                                  }}
                                  title={String(
                                    t("manage-photo-galleries-jump-view", {
                                      label,
                                    })
                                  )}
                                >
                                  {label}
                                </GalleryChipPrimary>
                                <GalleryChipSecondary
                                  href={editHref}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(editHref);
                                  }}
                                  title={String(
                                    t("manage-photo-galleries-jump-edit", {
                                      label,
                                    })
                                  )}
                                  aria-label={String(
                                    t("manage-photo-galleries-jump-edit", {
                                      label,
                                    })
                                  )}
                                >
                                  <BsPencilSquare aria-hidden />
                                </GalleryChipSecondary>
                              </GalleryChip>
                            );
                          })}
                        </GalleryChipRow>
                      ) : (
                        <EmptyValue>
                          {t("manage-photo-galleries-orphan")}
                        </EmptyValue>
                      )}
                    </OverviewMetaValue>
                  </OverviewMetaRow>
                  <OverviewMetaRow>
                    <OverviewMetaLabel>
                      {t("manage-photo-field-privacy")}
                    </OverviewMetaLabel>
                    <OverviewMetaValue>
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.isPrivate}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              isPrivate: e.target.checked,
                            }))
                          }
                        />
                        <BsEyeSlashFill aria-hidden />
                        {t("manage-photo-privacy-toggle")}
                      </label>
                    </OverviewMetaValue>
                  </OverviewMetaRow>
                </OverviewMeta>
              </RenditionRowLayout>
            );
          })()}
        </Section>
        <Section>
          <SectionTitle>{t("manage-photo-section-content")}</SectionTitle>
          <Field>
            <FieldLabel>
              {t("manage-photo-field-title")} ({primaryLang})
            </FieldLabel>
            <Input
              type="text"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              $highlight={highlight.title}
            />
            <LocalizedInputs
              value={form.titleLocalized}
              onChange={(lang, val) => setLocalizedField("titleLocalized", lang, val)}
              primary={primaryLang}
            />
            {highlight.title && (
              <FieldHint>{t("manage-photo-filter-match-hint")}</FieldHint>
            )}
          </Field>
          <Field>
            <FieldLabel>
              {t("manage-photo-field-description")} ({primaryLang})
            </FieldLabel>
            <TextArea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              $highlight={highlight.description}
            />
            <LocalizedInputs
              value={form.descriptionLocalized}
              onChange={(lang, val) =>
                setLocalizedField("descriptionLocalized", lang, val)
              }
              multiline
              primary={primaryLang}
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
                lang={primaryLang}
              />
              <LocalizedReadout
                resolve={countryNameFor}
                primary={primaryLang}
              />
              {highlight.country && (
                <FieldHint>{t("manage-photo-filter-match-hint")}</FieldHint>
              )}
            </Field>
            <Field>
              <FieldLabel>
                {t("manage-photo-field-place")} ({primaryLang})
              </FieldLabel>
              <Input
                type="text"
                value={form.place}
                onChange={(e) => setField("place", e.target.value)}
                $highlight={highlight.place}
              />
              <LocalizedInputs
                value={form.placeLocalized}
                onChange={(lang, val) =>
                  setLocalizedField("placeLocalized", lang, val)
                }
                primary={primaryLang}
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
          {(() => {
            // parseFloat("") is NaN; parseFloat("0") is 0 (a real
            // coordinate at the equator / Greenwich, not unset).
            // Convert via NaN-test, not falsy-coercion, so the
            // marker still renders for legitimate zero values.
            const parse = (s: string): number | null => {
              if (s.trim() === "") return null;
              const v = parseFloat(s);
              return Number.isFinite(v) ? v : null;
            };
            const lat = parse(form.latitude);
            const lon = parse(form.longitude);
            // Render the map when coords are set OR when editing is
            // allowed (so the operator can click-to-drop a new
            // marker). Locked rows with no coords skip the map —
            // there's nothing to look at and nothing actionable.
            const hasCoords = lat !== null && lon !== null;
            if (!hasCoords && exifDisabled) return null;
            return (
              <EditableMap
                lat={lat}
                lon={lon}
                onChange={(next) => {
                  setField("latitude", String(next.lat));
                  setField("longitude", String(next.lon));
                }}
                readOnly={exifDisabled}
              />
            );
          })()}
          <FieldHint>{t("manage-photo-coord-hint")}</FieldHint>
        </Section>
        <Section>
          <SectionTitle>{t("manage-photo-section-gear")}</SectionTitle>
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
          </FieldRow>
        </Section>
        <Section>
          <SectionTitle>{t("manage-photo-section-exposure")}</SectionTitle>
          <FieldRow>
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
            <Field>
              <FieldLabel>{t("manage-photo-field-exposure-time")}</FieldLabel>
              {renderExifInput("exposureTime", {
                type: "text",
                placeholder: "1/125",
              })}
              <FieldHint>{t("manage-photo-field-exposure-time-hint")}</FieldHint>
            </Field>
            <Field>
              <FieldLabel>{t("manage-photo-field-iso")}</FieldLabel>
              {renderExifInput("iso", { type: "number", step: 1 })}
            </Field>
          </FieldRow>
        </Section>
        <Section>
          <SectionTitle>{t("manage-photo-section-readonly")}</SectionTitle>
          <MetaTable>
            <MetaLabel>{t("manage-photo-field-id")}</MetaLabel>
            <MetaValue>
              {data.id}
              <CopyButton
                value={data.id}
                label={String(t("manage-photo-field-copy-id"))}
              />
            </MetaValue>
            {data.originalFilename && (
              <>
                <MetaLabel>{t("manage-photo-field-original-filename")}</MetaLabel>
                <MetaValue>
                  {data.originalFilename}
                  <CopyButton
                    value={data.originalFilename}
                    label={String(t("manage-photo-field-copy-original-filename"))}
                  />
                </MetaValue>
              </>
            )}
            {data.taken?.instant?.timestamp && (
              <>
                <MetaLabel>{t("manage-photo-field-taken")}</MetaLabel>
                <MetaValue>{data.taken.instant.timestamp}</MetaValue>
              </>
            )}
            {!!data.taken?.location?.coordinates?.latitude &&
              !!data.taken?.location?.coordinates?.longitude && (
                <>
                  <MetaLabel>{t("manage-photo-field-geocoded")}</MetaLabel>
                  <MetaValue>
                    <MetaValueRow>
                      <span>{renderGeocodedSummary(geocoded, t)}</span>
                      <InlineActionButton
                        type="button"
                        onClick={() => regeocodeMutation.mutate()}
                        disabled={regeocodeMutation.isPending}
                        title={String(t("manage-photo-geocoded-refresh-hint"))}
                      >
                        <BsArrowClockwise aria-hidden />
                        {regeocodeMutation.isPending
                          ? t("manage-photo-geocoded-refreshing")
                          : t("manage-photo-geocoded-refresh")}
                      </InlineActionButton>
                    </MetaValueRow>
                  </MetaValue>
                </>
              )}
          </MetaTable>
        </Section>
      </Body>
    );
  };

  // Public-side URL — only shown when the photos page is
  // filtered to a single gallery (so the drawer has a clear
  // gallery context to jump into) and the photo carries a
  // capture timestamp the public route can resolve. Format
  // mirrors the gallery routes:
  // /g/<gallery>/<year>/<month>/<day>/<photoId>.
  const publicUrl = ((): string | null => {
    if (!galleryId) return null;
    const ts = data?.taken?.instant?.timestamp;
    if (!ts) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(ts);
    if (!match) return null;
    const [, year, month, day] = match;
    return `/g/${galleryId}/${year}/${month}/${day}/${id}`;
  })();

  // Routed-mode prev/next: render arrows in the header, listen for
  // ← / → on capture phase so the table behind doesn't see them.
  const navigateToSibling = React.useCallback(
    (siblingId: string | undefined) => {
      if (!siblingId) return;
      if (dirty) {
        const ok = window.confirm(
          String(t("manage-photo-confirm-discard"))
        );
        if (!ok) return;
      }
      navigate(
        {
          pathname: `/m/photos/${siblingId}`,
          search: window.location.search,
        },
        { state: { skipScrollRestore: true } }
      );
    },
    [dirty, navigate, t]
  );
  React.useEffect(() => {
    if (mode !== "routed") return;
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack while the user is typing in an input/textarea.
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA")) {
        return;
      }
      if (e.key === "ArrowLeft" && prevPhotoId) {
        e.preventDefault();
        e.stopImmediatePropagation();
        navigateToSibling(prevPhotoId);
      } else if (e.key === "ArrowRight" && nextPhotoId) {
        e.preventDefault();
        e.stopImmediatePropagation();
        navigateToSibling(nextPhotoId);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [mode, prevPhotoId, nextPhotoId, navigateToSibling]);

  const titleLabel = data?.title || data?.originalFilename || data?.id || id;

  return (
    <Drawer>
      <Header>
        {mode === "routed" ? (
          <HeaderIconButton
            as="button"
            type="button"
            onClick={() => navigateToSibling(prevPhotoId)}
            aria-disabled={!prevPhotoId}
            aria-label={String(t("manage-photo-prev"))}
            title={String(t("manage-photo-prev"))}
          >
            <BsCaretLeftFill />
          </HeaderIconButton>
        ) : null}
        <Title title={titleLabel}>{titleLabel}</Title>
        <HeaderActions>
          {mode === "routed" ? (
            <HeaderIconButton
              as="button"
              type="button"
              onClick={() => navigateToSibling(nextPhotoId)}
              aria-disabled={!nextPhotoId}
              aria-label={String(t("manage-photo-next"))}
              title={String(t("manage-photo-next"))}
            >
              <BsCaretRightFill />
            </HeaderIconButton>
          ) : null}
          {mode === "inline" && id && (
            <HeaderIconButton
              as="button"
              type="button"
              onClick={() =>
                navigate(
                  `/m/photos/${id}${galleryId ? `?gallery=${galleryId}` : ""}`
                )
              }
              aria-label={String(t("manage-photo-open-in-manage"))}
              title={String(t("manage-photo-open-in-manage"))}
            >
              <BsBoxArrowUpRight />
            </HeaderIconButton>
          )}
          {mode === "routed" && publicUrl && (
            <HeaderIconButton
              as="button"
              type="button"
              onClick={() => navigate(publicUrl)}
              aria-label={String(t("manage-photo-view-on-site"))}
              title={String(t("manage-photo-view-on-site"))}
            >
              <BsBoxArrowUpRight />
            </HeaderIconButton>
          )}
          {galleryId && id ? (
            <HeaderIconButton
              as="button"
              type="button"
              onClick={() =>
                navigate(
                  `/m/g/${galleryId}?openIcon=${encodeURIComponent(id)}`
                )
              }
              aria-label={String(t("set-as-gallery-icon"))}
              title={String(t("set-as-gallery-icon"))}
            >
              <BsBookmarkStar />
            </HeaderIconButton>
          ) : null}
          <HeaderIconButton
            as="button"
            type="button"
            aria-label={String(t("close"))}
            title={String(t("close"))}
            onClick={close}
          >
            <BsXLg />
          </HeaderIconButton>
        </HeaderActions>
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

// Route-mounted wrapper. Reads photoId from `:photoId`, gallery
// id from `?gallery=` (single value only), and missing-chip set
// from `?missing=`; close strips the `/<photoId>` segment so the
// parent `/m/photos` page reasserts. Used at `/m/photos/:photoId`.
const RoutedPhotoDrawer = (): React.ReactElement => {
  const { photoId } = useParams<{ photoId: string }>();
  const [searchParams] = useSearchParams();
  const filteredGalleries = searchParams.getAll("gallery");
  const galleryId =
    filteredGalleries.length === 1 ? filteredGalleries[0] : undefined;
  const missingActive = activeMissing(searchParams);

  // Mirror the table's query so prev/next neighbours come from
  // exactly the photos list the operator sees behind the modal.
  // Same queryKey → TanStack returns the cached entry; no extra
  // fetch in the typical "click row → modal opens" flow.
  const filter = filterFromSearchParams(searchParams);
  const page = pageFromSearchParams(searchParams);
  const { data: pageData } = useQuery({
    queryKey: ["manage-photos", filter, page, PAGE_SIZE, photoId ?? null],
    queryFn: () =>
      photosService.list(filter, page, PAGE_SIZE, photoId ?? undefined),
    enabled: !!photoId,
    placeholderData: keepPreviousData,
  });
  const photosList = (pageData?.photos ?? []) as Array<{ id: string }>;
  const currentIndex = photosList.findIndex((p) => p.id === photoId);
  const prevPhotoId =
    currentIndex > 0 ? photosList[currentIndex - 1].id : undefined;
  const nextPhotoId =
    currentIndex >= 0 && currentIndex < photosList.length - 1
      ? photosList[currentIndex + 1].id
      : undefined;

  if (!photoId) return <></>;
  const closeTo = `/m/photos${window.location.search}`;
  return (
    <ItemModal closeTo={closeTo} noCloseButton>
      {({ close }) => (
        <PhotoDrawer
          photoId={photoId}
          galleryId={galleryId}
          onClose={close}
          missingActive={missingActive}
          mode="routed"
          prevPhotoId={prevPhotoId}
          nextPhotoId={nextPhotoId}
        />
      )}
    </ItemModal>
  );
};

export { PhotoDrawer };
export default RoutedPhotoDrawer;
