import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import Cropper, { type Area, type Point } from "react-easy-crop";

import galleriesService, {
  type IconCrop,
} from "../../services/galleries";
import config from "../../lib/config";

interface PhotoLike {
  id: string;
  renditions?: number[];
}

interface IconSource {
  photoId: string;
  sourceMaxDim?: number;
  crop?: IconCrop;
}

interface Props {
  galleryId: string;
  photos: PhotoLike[];
  initialSource: IconSource | null;
  onClose: () => void;
  onSaved: (icon: string) => void;
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;
const ModalBox = styled.div`
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 6px;
  padding: 20px;
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
`;
const Title = styled.h2`
  margin: 0;
  font-size: 1.1em;
`;
const Subtitle = styled.span`
  font-size: 0.85em;
  color: var(--inactive-color);
`;
const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
`;
const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`;
const FooterEnd = styled.div`
  display: flex;
  gap: 8px;
`;
const Button = styled.button<{ $primary?: boolean }>`
  padding: 6px 14px;
  border: 1px solid
    ${({ $primary }) =>
      $primary ? "var(--header-background)" : "var(--inactive-color)"};
  background: ${({ $primary }) =>
    $primary ? "var(--header-background)" : "transparent"};
  color: ${({ $primary }) =>
    $primary ? "var(--header-color)" : "var(--primary-color)"};
  font: inherit;
  border-radius: 4px;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
const CropStage = styled.div`
  position: relative;
  width: 100%;
  height: 360px;
  background: #111;
  border-radius: 4px;
  overflow: hidden;
`;
const ZoomRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85em;
  color: var(--inactive-color);
`;
const Range = styled.input`
  flex: 1;
`;
const PickerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 6px;
  overflow-y: auto;
  max-height: 400px;
  padding-right: 4px;
`;
const PickerTile = styled.button`
  position: relative;
  aspect-ratio: 1 / 1;
  border: 2px solid transparent;
  border-radius: 4px;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  background: var(--tile-background);
  &:hover,
  &:focus-visible {
    border-color: var(--primary-color);
  }
`;
const Thumb = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;
const ErrorText = styled.div`
  color: var(--alert-color, #c33);
  font-size: 0.9em;
`;
const PickerHint = styled.span`
  font-size: 0.85em;
  color: var(--inactive-color);
`;

const IconCropper = ({
  galleryId,
  photos,
  initialSource,
  onClose,
  onSaved,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const [sourcePhotoId, setSourcePhotoId] = React.useState<string | null>(
    initialSource?.photoId ?? null
  );
  const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] =
    React.useState<Area | null>(
      initialSource?.crop
        ? {
            x: initialSource.crop.x,
            y: initialSource.crop.y,
            width: initialSource.crop.width,
            height: initialSource.crop.height,
          }
        : null
    );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Capture-phase + stopImmediatePropagation so closing the
    // crop modal doesn't also trigger the Manage shell's Esc-up
    // navigation.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (busy) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [busy, onClose]);

  const onBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !busy) onClose();
  };

  const sourcePhoto = sourcePhotoId
    ? photos.find((p) => p.id === sourcePhotoId)
    : undefined;
  // Reopen → reuse the saved dim so the crop rect stays valid.
  // Fresh → largest available for max pixel detail.
  const savedSourceMaxDim =
    sourcePhotoId === initialSource?.photoId
      ? initialSource?.sourceMaxDim
      : undefined;
  const largestRenditionDim = sourcePhoto?.renditions?.length
    ? Math.max(...sourcePhoto.renditions)
    : 1500;
  const sourceMaxDim = savedSourceMaxDim ?? largestRenditionDim;
  const sourceUrl = sourcePhotoId
    ? `${config.PHOTO_ROOT_URL}display/${sourceMaxDim}/${sourcePhotoId}`
    : null;

  const onCropComplete = React.useCallback(
    (_areaPercent: Area, areaPixels: Area) => {
      setCroppedAreaPixels(areaPixels);
    },
    []
  );

  const handlePickPhoto = (id: string) => {
    setSourcePhotoId(id);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleChangePhoto = () => {
    setSourcePhotoId(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleSave = async () => {
    if (!sourcePhotoId || !croppedAreaPixels) return;
    setBusy(true);
    setError(null);
    try {
      const { icon } = await galleriesService.setIcon(
        galleryId,
        sourcePhotoId,
        {
          x: croppedAreaPixels.x,
          y: croppedAreaPixels.y,
          width: croppedAreaPixels.width,
          height: croppedAreaPixels.height,
        },
        sourceMaxDim
      );
      onSaved(icon);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : String(t("manage-gallery-icon-error"));
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Backdrop
      onClick={onBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="icon-cropper-title"
    >
      <ModalBox>
        <Title id="icon-cropper-title">
          {t("manage-gallery-icon-title")}
        </Title>
        {sourceUrl ? (
          <Body>
            <Subtitle>{t("manage-gallery-icon-crop-hint")}</Subtitle>
            <CropStage>
              <Cropper
                image={sourceUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </CropStage>
            <ZoomRow>
              {t("manage-gallery-icon-zoom")}
              <Range
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </ZoomRow>
          </Body>
        ) : (
          <Body>
            <PickerHint>{t("manage-gallery-icon-pick-hint")}</PickerHint>
            {photos.length === 0 ? (
              <PickerHint>{t("manage-gallery-icon-no-photos")}</PickerHint>
            ) : (
              <PickerGrid>
                {photos.map((p) => (
                  <PickerTile
                    key={p.id}
                    type="button"
                    title={p.id}
                    onClick={() => handlePickPhoto(p.id)}
                  >
                    <Thumb
                      src={`${config.PHOTO_ROOT_URL}thumbnail/${p.id}`}
                      alt={p.id}
                      loading="lazy"
                    />
                  </PickerTile>
                ))}
              </PickerGrid>
            )}
          </Body>
        )}
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Footer>
          {sourceUrl ? (
            <Button type="button" disabled={busy} onClick={handleChangePhoto}>
              {t("manage-gallery-icon-change-source")}
            </Button>
          ) : (
            <span />
          )}
          <FooterEnd>
            <Button type="button" disabled={busy} onClick={onClose}>
              {t("manage-user-button-cancel")}
            </Button>
            <Button
              type="button"
              $primary
              disabled={busy || !sourcePhotoId || !croppedAreaPixels}
              onClick={() => void handleSave()}
            >
              {busy
                ? t("manage-gallery-icon-saving")
                : t("manage-gallery-icon-save")}
            </Button>
          </FooterEnd>
        </Footer>
      </ModalBox>
    </Backdrop>
  );
};

export default IconCropper;
