import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BsImages, BsShieldLock, BsTrash } from "react-icons/bs";

import galleriesService from "../../services/galleries";
import { useUserStore } from "../../stores";
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
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  React.useEffect(() => {
    if (data) {
      setForm(fromGalleryData(data as GalleryData));
      setSaveError(null);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () => galleriesService.update(galleryId, toPatch(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery", galleryId] });
      queryClient.invalidateQueries({ queryKey: ["manage-galleries"] });
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
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
  const handleSave = (): void => {
    setSaveError(null);
    updateMutation.mutate();
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

      <GalleryFormFields form={form} setField={setField} />

      <Footer>
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
        <FooterRight>
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
        </FooterRight>
      </Footer>

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
