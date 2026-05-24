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
// when the URL targets a photo. `position: fixed; inset: 0` so the
// modal claims the viewport above whatever's mounted underneath.
// Backdrop uses the theme background (opaque) for the MVP — the
// architectural change is the value here (no Month remount on
// close, direct-link entries now mount Month synchronously). The
// "Month visible behind" visual will land in a follow-up once the
// chrome colours have been adjusted to read on a dimmed background
// across every theme.
const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--primary-background);
  display: flex;
  flex-direction: column;
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

  return (
    <Backdrop role="dialog" aria-modal="true">
      <title>
        {gallery.title(year, month, day, photo)} — {t("nav-gallery")}
      </title>
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
    </Backdrop>
  );
};
export default Photo;
