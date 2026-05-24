import React from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import {
  BsArrowsFullscreen,
  BsFullscreenExit,
  BsInfoCircleFill,
  BsXLg,
} from "react-icons/bs";
import type { SwipeEventData } from "react-swipeable";

import Swipeable from "../../Swipeable";

import Navigation from "./Navigation";
import Content from "./Content";
import MetadataPanel from "./MetadataPanel";

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
// Height uses `100dvh` (dynamic viewport) so on mobile Chrome the
// modal tracks the visual viewport as the URL bar shows/hides;
// `inset: 0` is the desktop fallback (and the spec behaviour
// before dvh is honoured).
const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  height: 100dvh;
  /* Above Leaflet's tile / overlay / marker / popup panes (z-index
     200-700 in the default Leaflet stylesheet) so the Month map
     underneath stays under the modal scrim instead of bleeding
     through on top of it. */
  z-index: 1000;
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
// Floating corner buttons over the modal. Close lives at the
// Frame's top-right (above the Navigation bar via z-index — small
// enough not to fight skip-next visually). Fullscreen lives at
// the photo area's top-left so it reads as "make this photo
// bigger" rather than "modal chrome". Both are pill-style with a
// translucent backdrop so they remain visible regardless of the
// underlying content (Navigation chrome on one side, photo or
// matte on the other).
const FloatingButton = styled.button`
  position: absolute;
  z-index: 10;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  &:hover {
    background: rgba(0, 0, 0, 0.7);
  }
`;
const CloseButton = styled(FloatingButton)`
  top: 8px;
  right: 8px;
`;
// 58 = 50px Navigation height + 8px breathing — pins the button
// to the photo area's top-left corner just below the toolbar.
const FullscreenButton = styled(FloatingButton)`
  top: 58px;
  left: 8px;
`;
// Info toggle sits in the photo area's bottom-right corner, the
// inverse of the fullscreen toggle. The metadata panel anchors at
// the same edge — toggling it on overlays the panel above the
// button (the panel's own bottom-right is at 16px from the
// corner, with the button at 8px).
const InfoButton = styled(FloatingButton)`
  bottom: 8px;
  right: 8px;
`;
// Body wraps Content+Footer in a flex column that fills the leftover
// space inside the modal Frame (between Navigation and the bottom
// edge). Without this Content's `flex-grow: 1` would be ineffective
// — Swipeable's plain `<div>` (or the React fragment in the zoomed
// branch) breaks the flex chain, and Content's Root collapses to
// its own content size, which then feeds back into the
// ResizeObserver inside Content and runs the photo down to nothing.
const Body = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;
const SwipeBody = styled(Swipeable)`
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
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

// Fullscreen API isn't supported in iOS Safari for arbitrary
// elements (only video) — surface the toggle only where it works.
const fullscreenSupported = (): boolean =>
  typeof document !== "undefined" && document.fullscreenEnabled === true;

const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.getElementById("root")?.requestFullscreen();
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
};

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
  const [isFullscreen, setIsFullscreen] = React.useState(
    typeof document !== "undefined" && !!document.fullscreenElement
  );
  React.useEffect(() => {
    if (!fullscreenSupported()) return;
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Metadata panel: open by default on desktop, closed on mobile so
  // the photo gets every available pixel. Persist across photo
  // changes within the same modal session.
  const [showMetadata, setShowMetadata] = React.useState(
    typeof window !== "undefined" && window.innerWidth > 600
  );

  // Lock body scroll while the modal is open so the Month
  // underneath doesn't scroll under the scrim (and so the user
  // can't accidentally scroll the Month map up over the modal).
  // Restore the previous value on close, not a hardcoded "auto",
  // in case some other code legitimately set it.
  React.useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

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

  // Photo modal lives over a mounted Month; both register window-
  // level Escape listeners via `useKeyPress`. Without coordination
  // both fire on the same Escape press — Photo navigates to Month,
  // Month then navigates to Year, and the user lands one level too
  // high. Listen in the capture phase and stopImmediatePropagation
  // so Photo's handler always runs first and Month's is skipped
  // while the modal is open.
  React.useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      handleClose();
    };
    window.addEventListener("keydown", onEscape, true);
    return () => window.removeEventListener("keydown", onEscape, true);
  }, [handleClose]);

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
        {fullscreenSupported() && (
          <FullscreenButton
            type="button"
            onClick={toggleFullScreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <BsFullscreenExit /> : <BsArrowsFullscreen />}
          </FullscreenButton>
        )}
        <InfoButton
          type="button"
          onClick={() => setShowMetadata((s) => !s)}
          aria-label={t("photo-metadata")}
          aria-pressed={showMetadata}
          title={t("photo-metadata")}
        >
          <BsInfoCircleFill />
        </InfoButton>
        {zoom.scale === 1 ? (
          <SwipeBody onSwiped={handleSwipe}>
            <Content
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              photo={photo}
              zoom={zoom}
              setZoom={setZoom}
            />
          </SwipeBody>
        ) : (
          <Body>
            <Content
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              photo={photo}
              zoom={zoom}
              setZoom={setZoom}
            />
          </Body>
        )}
        {showMetadata && (
          <MetadataPanel
            gallery={gallery}
            year={year}
            month={month}
            day={day}
            photo={photo}
            lang={lang}
            countryData={countryData}
            onClose={() => setShowMetadata(false)}
          />
        )}
      </Frame>
    </Backdrop>
  );
};
export default Photo;
