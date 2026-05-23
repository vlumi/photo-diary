import React from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  // Accepted (and ignored) to match the layout pattern used by Year/Month/Day —
  // Gallery/index wraps a Title+Filters block inside <Photo>, but Photo doesn't render it.
  children?: React.ReactNode;
  gallery: Gallery;
  year: number;
  month: number;
  day: number;
  photo: PhotoT;
  lang: string;
  countryData: CountryData;
}

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

  useKeyPress("Escape", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.path(year, month));
  });
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
    <>
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
    </>
  );
};
export default Photo;
