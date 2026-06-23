import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BsImages,
  BsPencilSquare,
  BsShieldLock,
  BsTrash,
} from "react-icons/bs";

import EpochAge from "../Gallery/EpochAge";
import EpochDayIndex from "../Gallery/EpochDayIndex";
import { useModalDirty, useModalEscape } from "./ItemModal";
import { Section, SectionTitle, ModalHeader } from "./Section";
import GalleryModel from "../../models/GalleryModel";
import config from "../../lib/config";
import filter, { type Filters as FiltersT, type ServerFilters } from "../../lib/filter";
import galleriesService from "../../services/galleries";
import savedFiltersService, {
  type SavedFilterDefinition,
} from "../../services/saved-filters";
import { useUserStore } from "../../stores";
import {
  toWireNumericRanges,
  type DateRange,
  type NumericRange,
  type NumericRanges,
} from "../../stores/filters";
import { languageNameIn } from "./LocalizedInputs";
import GalleryTypeIcon from "./GalleryTypeIcon";
import GallerySourcesSection from "./GallerySourcesSection";
import SavedFiltersSection from "./SavedFiltersSection";
import VirtualGalleryFilterSection from "./VirtualGalleryFilterSection";
import GalleryFormFields, {
  EMPTY_FORM,
  fromGalleryData,
  toPatch,
  type FormState,
} from "./GalleryForm";

const Root = styled.div`
  padding: 0 16px 16px;
  max-width: 640px;
  margin: 0 auto;
  text-align: left;
`;
const TitleRow = styled(ModalHeader)`
  /* Sticks just below the tab bar (48px) so the gallery identity
     stays in view as the body scrolls. */
  position: sticky;
  top: 48px;
  z-index: 1;
`;
// Left half of TitleRow: cover thumbnail (when present) +
// title-block (id + epoch-today line). Lays the visual identity
// of the gallery in one place so the operator immediately knows
// which gallery they're on.
const IdentityCluster = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;
const HeaderIconImg = styled.img`
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--inactive-color);
  background: var(--header-background);
  flex: 0 0 auto;
`;
const HeaderTitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;
const Title = styled.h2`
  margin: 0;
  font-size: 1.2em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;
const EpochNow = styled.div`
  font-size: 0.85em;
  color: var(--inactive-color);
  margin-top: 2px;
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
const Notice = styled.p`
  color: var(--inactive-color);
  font-style: italic;
  margin: 0;
`;
const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  /* Sticks at the modal Frame's bottom so Save / Cancel stay reachable
     when the form scrolls. Background + border separate it visually
     from the scrolling content above. */
  position: sticky;
  bottom: 0;
  background: var(--primary-background);
  padding: 12px 0;
  border-top: 1px solid var(--inactive-color);
`;
const FooterRight = styled.div`
  display: inline-flex;
  gap: 8px;
`;
const ButtonPrimary = styled.button`
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
const ButtonDanger = styled.button`
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: transparent;
  color: #c33;
  border: 1px solid #c33;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: rgba(204, 51, 51, 0.1);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
const ErrorBanner = styled.div`
  padding: 8px 12px;
  margin-bottom: 16px;
  background: rgba(220, 60, 60, 0.15);
  color: var(--primary-color);
  border-radius: 4px;
  font-size: 0.85em;
`;
const ConfirmPanel = styled.div`
  padding: 12px 16px;
  margin-top: 20px;
  background: rgba(220, 60, 60, 0.1);
  border: 1px solid #c33;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
const ConfirmHeading = styled.div`
  font-weight: bold;
  color: #c33;
`;
const ConfirmBody = styled.p`
  margin: 0;
  font-size: 0.9em;
`;
const ConfirmActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;
// Read-only key/value layout for view mode. Two columns: small
// uppercase label on the left, value on the right; long values
// wrap inside the value cell rather than push the label out.
const Summary = styled.dl`
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 16px;
  row-gap: 8px;
  margin: 0;
`;
const SummaryLabel = styled.dt`
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--inactive-color);
  padding-top: 2px;
  white-space: nowrap;
`;
const SummaryValue = styled.dd`
  margin: 0;
  word-break: break-word;
  min-width: 0;
`;
const SummaryEmpty = styled.span`
  color: var(--inactive-color);
  font-style: italic;
`;

interface GalleryData {
  id: string;
  title?: string;
  description?: string;
  icon?: string;
  iconSource?: string | null;
  epoch?: string;
  epochType?: string;
  theme?: string;
  initialView?: string;
  hostname?: string;
  defaultLanguage?: string;
  type?: "real" | "hybrid" | "saved_filter";
  photos?: Array<{ id: string }>;
  // Decorated by the server for `saved_filter` galleries: which
  // gallery owns the saved filter and its stored `{filter, dateRange}`
  // envelope. Used by `<VirtualGalleryFilterSection>` to surface the
  // parent and mount the shared filter builder.
  savedFilter?: {
    sourceGalleryId: string;
    definition?: {
      filter?: Record<string, unknown>;
      dateRange?: { from?: string; to?: string };
      numericRanges?: Record<string, { min?: number; max?: number }>;
      [key: string]: unknown;
    };
  };
}

interface ParsedIconSource {
  photoId: string;
  sourceMaxDim?: number;
  crop: { x: number; y: number; width: number; height: number };
}

const parseIconSource = (raw?: string | null): ParsedIconSource | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ParsedIconSource;
    if (
      typeof parsed.photoId === "string" &&
      parsed.crop &&
      typeof parsed.crop.x === "number" &&
      typeof parsed.crop.y === "number" &&
      typeof parsed.crop.width === "number" &&
      typeof parsed.crop.height === "number"
    ) {
      return parsed;
    }
  } catch {
    // Older / malformed payload — fall through to null.
  }
  return null;
};

const GalleryEdit = (): React.ReactElement => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const galleryId = params.galleryId as string;
  const user = useUserStore((s) => s.user);
  const queryClient = useQueryClient();

  const isAdmin = !!user?.isAdmin();
  const isEditor = !!(galleryId && user?.isGalleryEditor(galleryId));
  const { data, isLoading, isError } = useQuery({
    queryKey: ["gallery", galleryId, user?.id ?? null],
    queryFn: () => galleriesService.get(galleryId),
    enabled: !!galleryId && (isAdmin || isEditor),
  });

  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [original, setOriginal] = React.useState<FormState>(EMPTY_FORM);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Saved-filter state for virtual galleries. Lives alongside the
  // gallery form so one Save button covers both surfaces in edit
  // mode. Initialised from `gallery.savedFilter.definition` and
  // serialised back through `savedFiltersService.update` when
  // anything changed. Real / hybrid galleries leave these at the
  // defaults; nothing reads them.
  const [filters, setFilters] = React.useState<FiltersT>({});
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    undefined
  );
  const [numericRanges, setNumericRanges] = React.useState<NumericRanges>({});
  const [originalDefinition, setOriginalDefinition] =
    React.useState<SavedFilterDefinition>({});
  const setNumericRange = (
    category: string,
    range: NumericRange | undefined
  ) =>
    setNumericRanges((prev) => {
      const next = { ...prev };
      if (range === undefined) delete next[category];
      else next[category] = range;
      return next;
    });
  const definitionFromState = (): SavedFilterDefinition => {
    const def: SavedFilterDefinition = {};
    const server = filter.toServerFilters(filters);
    if (Object.keys(server).length > 0) def.filter = server;
    if (dateRange && (dateRange.from || dateRange.to)) {
      def.dateRange = {};
      if (dateRange.from) def.dateRange.from = dateRange.from;
      if (dateRange.to) def.dateRange.to = dateRange.to;
    }
    const wire = toWireNumericRanges(numericRanges);
    if (Object.keys(wire).length > 0) def.numericRanges = wire;
    return def;
  };
  const definitionDirty = (): boolean => {
    const next = definitionFromState();
    const orig: SavedFilterDefinition = {};
    if (originalDefinition.filter) orig.filter = originalDefinition.filter;
    if (
      originalDefinition.dateRange &&
      (originalDefinition.dateRange.from || originalDefinition.dateRange.to)
    ) {
      orig.dateRange = originalDefinition.dateRange;
    }
    if (
      originalDefinition.numericRanges &&
      Object.keys(originalDefinition.numericRanges).length > 0
    ) {
      orig.numericRanges = originalDefinition.numericRanges;
    }
    return JSON.stringify(next) !== JSON.stringify(orig);
  };
  const resetFilterStateFromDefinition = (def: SavedFilterDefinition) => {
    setFilters(filter.fromServerFilters(def.filter as ServerFilters | undefined));
    setDateRange(
      def.dateRange && (def.dateRange.from || def.dateRange.to)
        ? def.dateRange
        : undefined
    );
    setNumericRanges(def.numericRanges ?? {});
  };
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  // `?openIcon=<photoId>` arrives from the "Set as gallery icon"
  // link on the photo view; it auto-opens the cropper on that
  // photo. Promote into Edit mode + remember the bootstrap source
  // so the form passes it to GalleryFormFields. Clear the URL
  // param so a reload doesn't re-trigger the modal.
  const [searchParams, setSearchParams] = useSearchParams();
  const openIconParam = searchParams.get("openIcon");
  const [bootstrapIconSource, setBootstrapIconSource] = React.useState<
    { photoId: string } | null
  >(openIconParam ? { photoId: openIconParam } : null);
  const [editing, setEditing] = React.useState(!!openIconParam);
  React.useEffect(() => {
    if (openIconParam) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("openIcon");
          return next;
        },
        { replace: true }
      );
    }
    // Strip the param exactly once, on mount. Subsequent state
    // changes don't depend on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!data) return;
    const next = fromGalleryData(data as GalleryData);
    setForm(next);
    setOriginal(next);
    setSaveError(null);
    const sf = (data as GalleryData).savedFilter;
    const def = (sf?.definition ?? {}) as SavedFilterDefinition;
    setOriginalDefinition(def);
    resetFilterStateFromDefinition(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Gallery fields first — id-bearing patch. Empty patch (no
      // gallery-side changes) still gets sent; server treats it as
      // a no-op.
      await galleriesService.update(
        galleryId,
        toPatch(form, original, isAdmin)
      );
      // Saved-filter definition second, only for virtual galleries
      // whose filter / dateRange / numericRanges actually changed.
      // Same Save button covers both surfaces, no second commit
      // step for the operator.
      const sf = (data as GalleryData | undefined)?.savedFilter;
      if (sf && definitionDirty()) {
        await savedFiltersService.update(sf.sourceGalleryId, galleryId, {
          definition: definitionFromState(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery", galleryId] });
      queryClient.invalidateQueries({ queryKey: ["manage-galleries"] });
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
      setEditing(false);
    },
    onError: (err: Error) => {
      setSaveError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => galleriesService.remove(galleryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manage-galleries"] });
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
      navigate("/m/galleries");
    },
    onError: (err: Error) => {
      setSaveError(err.message);
      setConfirmingDelete(false);
    },
  });

  const setField = (key: keyof FormState, value: string): void => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const setLocalized = (
    key: "titleLocalized" | "descriptionLocalized",
    lang: string,
    value: string
  ): void => {
    setForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], [lang]: value },
    }));
  };
  const handleSave = (): void => {
    setSaveError(null);
    updateMutation.mutate();
  };
  const handleStartEdit = (): void => {
    setSaveError(null);
    setEditing(true);
  };
  const handleCancelEdit = (): void => {
    // Discard pending edits — reset both the gallery form and the
    // saved-filter state back to the server's current value before
    // flipping out of edit mode.
    if (data) setForm(original);
    resetFilterStateFromDefinition(originalDefinition);
    setSaveError(null);
    setEditing(false);
  };

  const formDirty =
    JSON.stringify(form) !== JSON.stringify(original) || definitionDirty();
  useModalDirty(editing && formDirty);
  useModalEscape(
    () => {
      if (!editing) return false;
      if (formDirty) {
        const ok = window.confirm(String(t("manage-modal-confirm-discard")));
        if (!ok) return true;
      }
      handleCancelEdit();
      return true;
    },
    [editing, formDirty, t]
  );

  if (isLoading)
    return (
      <Root>
        <Notice>{t("loading")}</Notice>
      </Root>
    );
  if (isError || !data) {
    return (
      <Root>
        <Notice>{t("manage-gallery-load-error")}</Notice>
      </Root>
    );
  }

  const gallery = data as GalleryData;
  const renderValue = (value: string | undefined): React.ReactNode =>
    value && value.length > 0 ? (
      value
    ) : (
      <SummaryEmpty>{t("manage-gallery-summary-empty")}</SummaryEmpty>
    );

  // Compute today's date through the gallery's epoch scheme — reuses
  // the public viewer's per-day chip components so the rendering
  // stays in sync with how visitors see dates. Requires a
  // Gallery model instance since EpochAge / EpochDayIndex read via
  // gallery.epochYmd() / .hasEpoch().
  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth() + 1;
  const todayD = today.getDate();
  // Strip photos before constructing the model — the admin endpoint
  // returns raw photo POJOs, but GalleryModel expects already-built
  // PhotoModel instances and chokes on `.year()` etc. We only need
  // the model for its epoch math, so the empty array suffices.
  const galleryModel = GalleryModel({ ...gallery, photos: [] });
  const renderEpochNow = (): React.ReactNode => {
    if (!galleryModel || !gallery.epoch || !gallery.epochType) return null;
    switch (gallery.epochType) {
      case "birthday":
        return (
          <EpochNow>
            {t("manage-gallery-epoch-today")}:{" "}
            <EpochAge
              gallery={galleryModel}
              year={todayY}
              month={todayM}
              day={todayD}
              separator=" "
            />
          </EpochNow>
        );
      case "1-index":
        return (
          <EpochNow>
            {t("manage-gallery-epoch-today")}:{" "}
            <EpochDayIndex
              gallery={galleryModel}
              year={todayY}
              month={todayM}
              day={todayD}
              lang={i18n.language}
            />
          </EpochNow>
        );
      case "0-index":
        return (
          <EpochNow>
            {t("manage-gallery-epoch-today")}:{" "}
            <EpochDayIndex
              gallery={galleryModel}
              year={todayY}
              month={todayM}
              day={todayD}
              lang={i18n.language}
              start={0}
            />
          </EpochNow>
        );
      default:
        return null;
    }
  };

  return (
    <Root>
      <TitleRow>
        <IdentityCluster>
          {gallery.icon && (
            <HeaderIconImg
              src={`${config.PHOTO_ROOT_URL}${gallery.icon}`}
              alt=""
            />
          )}
          <HeaderTitleBlock>
            <Title>
              <GalleryTypeIcon type={gallery.type} />
              {galleryId}
            </Title>
            {renderEpochNow()}
          </HeaderTitleBlock>
        </IdentityCluster>
        <SiblingNav aria-label={String(t("manage-gallery-nav-group"))}>
          <SiblingLink
            onClick={() => navigate(`/m/photos?gallery=${galleryId}`)}
            role="link"
            tabIndex={0}
          >
            <BsImages aria-hidden />
            {t("manage-gallery-link-photos")}
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

      {editing ? (
        <>
          <GalleryFormFields
            form={form}
            setField={setField}
            setLocalized={setLocalized}
            galleryId={galleryId}
            photos={(data as GalleryData | undefined)?.photos ?? []}
            iconSource={
              bootstrapIconSource ??
              parseIconSource(
                (data as GalleryData | undefined)?.iconSource
              )
            }
            autoOpenCropper={!!bootstrapIconSource}
            onCropperClosed={() => setBootstrapIconSource(null)}
            onIconChanged={() => {
              queryClient.invalidateQueries({
                queryKey: ["gallery", galleryId],
              });
              queryClient.invalidateQueries({ queryKey: ["manage-galleries"] });
              queryClient.invalidateQueries({ queryKey: ["galleries"] });
            }}
            hostnameEditable={isAdmin}
          />
          {gallery.type === "hybrid" ? (
            <GallerySourcesSection
              galleryId={galleryId}
              editing
              sources={form.sources}
              setSources={(sources) =>
                setForm((prev) => ({ ...prev, sources }))
              }
            />
          ) : null}
          {gallery.type === "saved_filter" && gallery.savedFilter ? (
            <VirtualGalleryFilterSection
              galleryId={galleryId}
              sourceGalleryId={gallery.savedFilter.sourceGalleryId}
              editing
              filters={filters}
              setFilters={setFilters}
              dateRange={dateRange}
              setDateRange={setDateRange}
              numericRanges={numericRanges}
              setNumericRange={setNumericRange}
            />
          ) : null}
          <Footer>
            <span />
            <FooterRight>
              <ButtonSecondary
                type="button"
                onClick={handleCancelEdit}
                disabled={updateMutation.isPending}
              >
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
            </FooterRight>
          </Footer>
        </>
      ) : (
        <>
          <Section>
            <SectionTitle>
              {t("manage-gallery-section-content")}
            </SectionTitle>
            <Summary>
              <SummaryLabel>{t("manage-gallery-field-title")}</SummaryLabel>
              <SummaryValue>{renderValue(gallery.title)}</SummaryValue>
              <SummaryLabel>
                {t("manage-gallery-field-description")}
              </SummaryLabel>
              <SummaryValue>{renderValue(gallery.description)}</SummaryValue>
              <SummaryLabel>
                {t("manage-gallery-field-default-language")}
              </SummaryLabel>
              <SummaryValue>
                {renderValue(
                  gallery.defaultLanguage
                    ? languageNameIn(gallery.defaultLanguage, i18n.language)
                    : undefined
                )}
              </SummaryValue>
              <SummaryLabel>{t("manage-gallery-field-icon")}</SummaryLabel>
              <SummaryValue>{renderValue(gallery.icon)}</SummaryValue>
            </Summary>
          </Section>
          <Section>
            <SectionTitle>
              {t("manage-gallery-section-display")}
            </SectionTitle>
            <Summary>
              <SummaryLabel>{t("manage-gallery-field-theme")}</SummaryLabel>
              <SummaryValue>{renderValue(gallery.theme)}</SummaryValue>
              <SummaryLabel>
                {t("manage-gallery-field-initial-view")}
              </SummaryLabel>
              <SummaryValue>
                {renderValue(gallery.initialView)}
              </SummaryValue>
            </Summary>
          </Section>
          <Section>
            <SectionTitle>
              {t("manage-gallery-section-epoch")}
            </SectionTitle>
            <Summary>
              <SummaryLabel>{t("manage-gallery-field-epoch")}</SummaryLabel>
              <SummaryValue>{renderValue(gallery.epoch)}</SummaryValue>
              <SummaryLabel>
                {t("manage-gallery-field-epoch-type")}
              </SummaryLabel>
              <SummaryValue>{renderValue(gallery.epochType)}</SummaryValue>
            </Summary>
          </Section>
          <Section>
            <SectionTitle>{t("manage-gallery-section-scope")}</SectionTitle>
            <Summary>
              <SummaryLabel>{t("manage-gallery-field-hostname")}</SummaryLabel>
              <SummaryValue>{renderValue(gallery.hostname)}</SummaryValue>
            </Summary>
          </Section>
          {gallery.type === "hybrid" ? (
            <GallerySourcesSection
              galleryId={galleryId}
              editing={false}
              sources={form.sources}
            />
          ) : null}
          {(gallery.type ?? "real") === "real" && (
            <SavedFiltersSection galleryId={galleryId} />
          )}
          {gallery.type === "saved_filter" && gallery.savedFilter ? (
            <VirtualGalleryFilterSection
              galleryId={galleryId}
              sourceGalleryId={gallery.savedFilter.sourceGalleryId}
              editing={false}
              filters={filters}
              dateRange={dateRange}
              numericRanges={numericRanges}
            />
          ) : null}
          <Footer>
            {isAdmin && (
              <ButtonDanger
                type="button"
                onClick={() => {
                  setSaveError(null);
                  setConfirmingDelete(true);
                }}
                disabled={deleteMutation.isPending || confirmingDelete}
              >
                <BsTrash aria-hidden />
                {t("manage-gallery-button-delete")}
              </ButtonDanger>
            )}
            <FooterRight>
              <ButtonPrimary type="button" onClick={handleStartEdit}>
                <BsPencilSquare aria-hidden />
                {t("manage-gallery-button-edit")}
              </ButtonPrimary>
            </FooterRight>
          </Footer>
        </>
      )}

      {confirmingDelete && (
        <ConfirmPanel role="alertdialog" aria-labelledby="delete-confirm-heading">
          <ConfirmHeading id="delete-confirm-heading">
            {t("manage-gallery-delete-heading", { id: galleryId })}
          </ConfirmHeading>
          <ConfirmBody>{t("manage-gallery-delete-body")}</ConfirmBody>
          <ConfirmActions>
            <ButtonSecondary
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleteMutation.isPending}
            >
              {t("manage-gallery-button-cancel")}
            </ButtonSecondary>
            <ButtonDanger
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <BsTrash aria-hidden />
              {deleteMutation.isPending
                ? t("manage-gallery-button-deleting")
                : t("manage-gallery-button-confirm-delete")}
            </ButtonDanger>
          </ConfirmActions>
        </ConfirmPanel>
      )}
    </Root>
  );
};

export default GalleryEdit;
