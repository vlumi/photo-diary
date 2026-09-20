import type { ApiPhoto } from "../../../lib/api-types";
import { type MissingField, type PhotoUpdatePatch } from "../../../services/photos";
import { SUPPORTED_LANGS } from "../LocalizedInputs";

// The photo as the server sends it, from its own schema. Only the
// intake snapshot is described here: the server passes it through as
// an open blob, and the drawer reads these parts of it.
// EXIF snapshot captured at converter intake. Undefined on
// rows that pre-date migration 014. Drives the per-field revert
// affordance and the "no backup" gate on EXIF-derived inputs.
export interface IntakeSnapshot {
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
}

// An intersection, not `Omit`: the schema's types carry an index
// signature (the server may add fields), and `Omit` over one of those
// collapses the known keys.
export type PhotoData = ApiPhoto & { exifAtIntake?: IntakeSnapshot };

// Editable subset of the photo — mirrors the server's PhotoUpdateBody
// schema. EXIF / geocoded fields stay read-only.
export interface FormState {
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

export const emptyLocalized = (): Record<string, string> =>
  Object.fromEntries(SUPPORTED_LANGS.map((l) => [l, ""]));

export const emptyForm = (): FormState => ({
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

export const numField = (v: number | null | undefined): string =>
  v !== undefined && v !== null ? String(v) : "";

// Accept either decimal seconds ("0.008") or photographer-friendly
// fractions ("1/125") in the exposure-time field. Empty string and
// nonsense return null so toPatch can skip the field.
export const parseExposureTime = (raw: string): number | null => {
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
export const formatExposureTimeForInput = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds >= 1) return String(seconds);
  return `1/${Math.round(1 / seconds)}`;
};

export const localizedFrom = (
  map: Record<string, string> | undefined
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const lang of SUPPORTED_LANGS) out[lang] = map?.[lang] ?? "";
  return out;
};

export const formFrom = (p: PhotoData): FormState => ({
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
export const localizedPatch = (
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
export const patchFrom = (
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
export const activeMissing = (searchParams: URLSearchParams): Set<MissingField> => {
  const out = new Set<MissingField>();
  for (const m of searchParams.getAll("missing")) {
    out.add(m as MissingField);
  }
  return out;
};
