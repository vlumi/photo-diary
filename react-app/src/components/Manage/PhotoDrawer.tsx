import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BsArrowClockwise,
  BsBookmarkStar,
  BsBoxArrowUpRight,
  BsCaretLeftFill,
  BsCaretRightFill,
  BsEyeSlashFill,
  BsPencilSquare,
  BsXLg,
} from "react-icons/bs";
import ItemModal, { useModalDirty } from "./ItemModal";
import { Section, SectionTitle } from "./Section";
import { filterFromSearchParams, pageFromSearchParams, PAGE_SIZE } from "./Photos";
import galleriesService from "../../services/galleries";
import metaService from "../../services/meta";
import photosService, { type MissingField } from "../../services/photos";
import config from "../../lib/config";
import { isCountrySentinel } from "../../lib/country-sentinel";
import { ensureAllCountryLocales, useLangStore } from "../../stores";
import CountrySelect from "./CountrySelect";
import EditableMap from "./EditableMap.lazy";
import LocalizedInputs, { LocalizedReadout } from "./LocalizedInputs";
import {
  FormState,
  PhotoData,
  activeMissing,
  emptyForm,
  formFrom,
  formatExposureTimeForInput,
  patchFrom,
} from "./PhotoDrawer/form";
import {
  CopyButton,
  renderGeocodedSummary,
} from "./PhotoDrawer/parts";
import {
  Body,
  ButtonPrimary,
  ButtonSecondary,
  Drawer,
  EmptyValue,
  ErrorBanner,
  Field,
  FieldHint,
  FieldLabel,
  FieldRow,
  Footer,
  GalleryChip,
  GalleryChipPrimary,
  GalleryChipRow,
  GalleryChipSecondary,
  Header,
  HeaderActions,
  HeaderIconButton,
  InlineActionButton,
  Input,
  InputRow,
  MetaLabel,
  MetaTable,
  MetaValue,
  MetaValueRow,
  OverviewMeta,
  OverviewMetaLabel,
  OverviewMetaRow,
  OverviewMetaValue,
  RenditionChip,
  RenditionChips,
  RenditionHero,
  RenditionHeroImg,
  RenditionRowLayout,
  RevertButton,
  TextArea,
  Title,
  UnlockRow,
} from "./PhotoDrawer/styles";

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
  // Routed-mode prev/next neighbors from the cached photos list.
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
    // mid-swap.
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
  // has no `exifAtIntake` blob. Resets when the open photo
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

  // Mirror the table's query so prev/next neighbors come from
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
