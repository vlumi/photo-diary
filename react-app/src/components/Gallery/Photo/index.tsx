import React from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import { BsXLg } from "react-icons/bs";
import type { SwipeEventData } from "react-swipeable";

import Swipeable from "../../Swipeable";

import Navigation from "./Navigation";
import Content from "./Content";
import Footer from "./Footer";

import useKeyPress from "../../../lib/keypress";

import type { Gallery } from "../../../models/GalleryModel";
import type { Photo as PhotoT } from "../../../models/PhotoModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

interface Props {
  gallery: Gallery;
  year: number;
  month: number;
  day: number;
  photo: PhotoT;
  lang: string;
  countryData: CountryData;
}

// Modal overlay over the Month view rendered by Gallery/index.tsx
// when the URL targets a photo. The backdrop is a dimmed scrim
// that lets Month show through (theme-independent dark so the
// contrast against the photo is consistent across themes).
// Backdrop click closes the modal — see `handleBackdropClick`.
const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 20px;
  /* Mobile: lose the inset so the photo claims the full viewport
     — the dimmed-Month-behind effect doesn't read at narrow widths
     and the photo needs every pixel it can get. */
  @media (max-width: 600px) {
    padding: 0;
  }
`;
// Contained modal frame — visible boundary, rounded corners, soft
// drop shadow so the modal reads as a panel sitting *above* the
// dimmed Month. Theme background so the chrome inside still reads
// correctly (Footer text colour, Navigation icons) without needing
// a separate "modal theme".
const Frame = styled.div`
  flex: 1 1 auto;
  max-width: 1400px;
  background: var(--primary-background);
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  @media (max-width: 600px) {
    border-radius: 0;
    box-shadow: none;
  }
`;
const CloseButton = styled.button`
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 10;
  background: none;
  border: none;
  color: var(--header-color);
  font-size: 20px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  &:hover {
    color: var(--primary-color);
  }
`;

// Zoom state lives here so `<Swipeable>` can be bypassed while zoomed
// (otherwise drag-to-pan would also fire swipe-to-next/prev) and so
// navigating to another photo resets the zoom cleanly.
const ZOOM_STEP = 1.2;
const MIN_SCALE = 1;
const MAX_SCALE = 8;
const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
export interface ZoomState {
  scale: number;
  x: number;
  y: number;
}
const ZOOM_RESET: ZoomState = { scale: 1, x: 0, y: 0 };

const Photo = ({
  gallery,
  year,
  month,
  day,
  photo,
  lang,
  countryData,
}: Props): React.ReactElement => {
  const [redirect, setRedirect] = React.useState<string | undefined>(undefined);
  const [zoom, setZoom] = React.useState<ZoomState>(ZOOM_RESET);

  const { t } = useTranslation();

  // Reset zoom whenever the photo changes — including via prev/next nav.
  React.useEffect(() => {
    setZoom(ZOOM_RESET);
  }, [photo.id()]);

  useKeyPress("+", () =>
    setZoom((z) => ({ ...z, scale: clampScale(z.scale * ZOOM_STEP) }))
  );
  useKeyPress("=", () =>
    setZoom((z) => ({ ...z, scale: clampScale(z.scale * ZOOM_STEP) }))
  );
  useKeyPress("-", () =>
    setZoom((z) => ({ ...z, scale: clampScale(z.scale / ZOOM_STEP) }))
  );
  useKeyPress("0", () => setZoom(ZOOM_RESET));

  const handlMoveToFirst = () => {
    const first = gallery.firstPhoto();
    if (!gallery.isFirstPhoto(photo) && first) {
      window.history.pushState({}, "");
      setRedirect(first.path(gallery));
    }
  };
  const handlMoveToPrevious = () => {
    if (!gallery.isFirstPhoto(photo)) {
      window.history.pushState({}, "");
      setRedirect(gallery.previousPhoto(year, month, day, photo).path(gallery));
    }
  };
  const handlMoveToNext = () => {
    if (!gallery.isLastPhoto(photo)) {
      window.history.pushState({}, "");
      setRedirect(gallery.nextPhoto(year, month, day, photo).path(gallery));
    }
  };
  const handlMoveToLast = () => {
    const last = gallery.lastPhoto();
    if (!gallery.isLastPhoto(photo) && last) {
      window.history.pushState({}, "");
      setRedirect(last.path(gallery));
    }
  };

  const handleClose = React.useCallback(() => {
    window.history.pushState({}, "");
    setRedirect(gallery.path(year, month));
  }, [gallery, year, month]);

  useKeyPress("Escape", handleClose);
  useKeyPress("Home", handlMoveToFirst);
  useKeyPress("ArrowLeft", handlMoveToPrevious);
  useKeyPress("ArrowRight", handlMoveToNext);
  useKeyPress("End", handlMoveToLast);
  const handleSwipe = (event: SwipeEventData) => {
    switch (event.dir) {
      case "Left":
        handlMoveToNext();
        break;
      case "Right":
        handlMoveToPrevious();
        break;
      default:
        break;
    }
  };

  React.useEffect(() => {
    if (redirect) {
      const handle = setTimeout(() => setRedirect(""), 0);
      return () => {
        setRedirect("");
        clearTimeout(handle);
      };
    }
  }, [redirect]);
  if (redirect) {
    return <Navigate to={redirect} replace />;
  }

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) handleClose();
  };

  return (
    <Backdrop
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <title>
        {gallery.title(year, month, day, photo)} — {t("nav-gallery")}
      </title>
      <Frame>
        <Navigation
          gallery={gallery}
          year={year}
          month={month}
          day={day}
          photo={photo}
          lang={lang}
        />
        <CloseButton
          type="button"
          onClick={handleClose}
          aria-label={t("close")}
          title={t("close")}
        >
          <BsXLg />
        </CloseButton>
        {zoom.scale === 1 ? (
          <Swipeable onSwiped={handleSwipe}>
            <Content
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              photo={photo}
              zoom={zoom}
              setZoom={setZoom}
            />
            <Footer
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              photo={photo}
              lang={lang}
              countryData={countryData}
            />
          </Swipeable>
        ) : (
          <>
            <Content
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              photo={photo}
              zoom={zoom}
              setZoom={setZoom}
            />
            <Footer
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              photo={photo}
              lang={lang}
              countryData={countryData}
            />
          </>
        )}
      </Frame>
    </Backdrop>
  );
};
export default Photo;
