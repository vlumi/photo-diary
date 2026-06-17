import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import MapContainer from "./MapContainer.lazy";

import { useBodyScrollLock } from "../lib/useBodyScrollLock";
import type { Photo } from "../models/PhotoModel";

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
  max-width: 1100px;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
`;
const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
`;
const Title = styled.h2`
  margin: 0;
  font-size: 1.1em;
`;
const CloseButton = styled.button`
  border: none;
  background: none;
  color: var(--inactive-color);
  font-size: 1.2em;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  &:hover {
    color: var(--primary-color);
  }
`;
const MapArea = styled.div`
  flex: 1 1 auto;
  min-height: 0;
`;

interface Props {
  title: string;
  photos: Photo[];
  drawLine?: boolean;
  // Threaded through to MapContainer so each marker popup links to
  // the photo view at /g/<galleryId>/...
  galleryId?: string;
  // Global stats / admin map — popup links to /m/photos/<id> instead.
  adminLink?: boolean;
  onClose: () => void;
}

const MapModal = ({
  title,
  photos,
  drawLine,
  galleryId,
  adminLink,
  onClose,
}: Props): React.ReactElement => {
  const { t } = useTranslation();

  React.useEffect(() => {
    // Capture phase + stopImmediatePropagation so the underlying view's
    // Esc handler (Month/Year navigating one level up) doesn't also fire.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  useBodyScrollLock();

  const onBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) onClose();
  };

  const height =
    typeof window !== "undefined"
      ? Math.max(320, Math.min(800, window.innerHeight - 160))
      : 600;

  return (
    <Backdrop
      onClick={onBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-modal-title"
    >
      <ModalBox>
        <Header>
          <Title id="map-modal-title">{title}</Title>
          <CloseButton type="button" onClick={onClose} aria-label={t("close")}>
            ╳
          </CloseButton>
        </Header>
        <MapArea>
          <MapContainer
            positions={photos}
            height={height}
            maxZoom={18}
            drawLine={drawLine}
            showLocate
            galleryId={galleryId}
            adminLink={adminLink}
          />
        </MapArea>
      </ModalBox>
    </Backdrop>
  );
};
export default MapModal;
