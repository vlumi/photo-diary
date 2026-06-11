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

import galleriesService from "../../services/galleries";
import { useUserStore } from "../../stores";
import { languageNameIn } from "./LocalizedInputs";
import SavedFiltersSection from "./SavedFiltersSection";
import GalleryFormFields, {
  EMPTY_FORM,
  fromGalleryData,
  toPatch,
  type FormState,
} from "./GalleryForm";

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
  photos?: Array<{ id: string }>;
}

interface ParsedIconSource {
  photoId: string;
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
    if (data) {
      const next = fromGalleryData(data as GalleryData);
      setForm(next);
      setOriginal(next);
      setSaveError(null);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      galleriesService.update(galleryId, toPatch(form, original, isAdmin)),
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
    // Discard pending edits — reset the form back to the
    // server's current value before flipping out of edit mode.
    if (data) setForm(original);
    setSaveError(null);
    setEditing(false);
  };

  if (isLoading) return <Root><Notice>{t("loading")}</Notice></Root>;
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

  return (
    <Root>
      <TitleRow>
        <Title>{galleryId}</Title>
        <SiblingNav aria-label={String(t("manage-gallery-nav-group"))}>
          <SiblingLink
            onClick={() => navigate(`/m/photos?gallery=${galleryId}`)}
            role="link"
            tabIndex={0}
          >
            <BsImages aria-hidden />
            {t("manage-gallery-link-photos")}
          </SiblingLink>
          {isAdmin && (
            <SiblingLink
              onClick={() => navigate(`/m/g/${galleryId}/access`)}
              role="link"
              tabIndex={0}
            >
              <BsShieldLock aria-hidden />
              {t("manage-gallery-link-access")}
            </SiblingLink>
          )}
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
          <Summary>
            <SummaryLabel>{t("manage-gallery-field-title")}</SummaryLabel>
            <SummaryValue>{renderValue(gallery.title)}</SummaryValue>
            <SummaryLabel>{t("manage-gallery-field-description")}</SummaryLabel>
            <SummaryValue>{renderValue(gallery.description)}</SummaryValue>
            <SummaryLabel>{t("manage-gallery-field-icon")}</SummaryLabel>
            <SummaryValue>{renderValue(gallery.icon)}</SummaryValue>
            <SummaryLabel>{t("manage-gallery-field-theme")}</SummaryLabel>
            <SummaryValue>{renderValue(gallery.theme)}</SummaryValue>
            <SummaryLabel>{t("manage-gallery-field-initial-view")}</SummaryLabel>
            <SummaryValue>{renderValue(gallery.initialView)}</SummaryValue>
            <SummaryLabel>{t("manage-gallery-field-epoch")}</SummaryLabel>
            <SummaryValue>{renderValue(gallery.epoch)}</SummaryValue>
            <SummaryLabel>{t("manage-gallery-field-epoch-type")}</SummaryLabel>
            <SummaryValue>{renderValue(gallery.epochType)}</SummaryValue>
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
            <SummaryLabel>{t("manage-gallery-field-hostname")}</SummaryLabel>
            <SummaryValue>{renderValue(gallery.hostname)}</SummaryValue>
          </Summary>
          <SavedFiltersSection
            galleryId={galleryId}
            defaultLanguage={gallery.defaultLanguage}
          />
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
