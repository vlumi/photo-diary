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

// Modal overlay over the Month view (see Gallery/index.tsx).
// `100dvh` tracks mobile Chrome's visual viewport as the URL bar
// shows/hides. `box-sizing: border-box` so the explicit height
// + padding don't add up past the viewport — without it the
// modal extends ~40px past the bottom on desktop. z-index above
// Leaflet's panes (200-700) so a map on Month underneath can't
// bleed through the scrim.
const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  height: 100dvh;
  box-sizing: border-box;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 20px;
  @media (max-width: 600px) {
    padding: 8px;
  }
`;
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
// Floating corner buttons over the modal: close, fullscreen, info
// toggle. Pill-style with a translucent backdrop so they remain
// visible against any underlying content.
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
// 58 = 50px Navigation height + 8px clearance.
const FullscreenButton = styled(FloatingButton)`
  top: 58px;
  left: 8px;
`;
const InfoButton = styled(FloatingButton)`
  bottom: 16px;
  right: 16px;
`;
// Flex column that gives Content a stable parent size. Without
// this Content's flex-grow has no flex parent — Swipeable's plain
// div breaks the chain — and Content's ResizeObserver feeds back
// into itself and shrinks the photo to nothing.
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

// Zoom state lives here so Swipeable is bypassed while zoomed
// (drag-to-pan would otherwise fire swipe-to-next/prev) and so
// photo navigation resets the zoom cleanly.
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

// iOS Safari only supports the Fullscreen API on <video>.
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

  // Open by default on desktop, closed on mobile so the photo gets
  // every available pixel.
  const [showMetadata, setShowMetadata] = React.useState(
    typeof window !== "undefined" && window.innerWidth > 600
  );

  // Freeze the Month underneath while the modal is open.
  React.useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const { t } = useTranslation();

  React.useEffect(() => {
    setZoom(ZOOM_RESET);
  }, [photo.id()]);

  useKeyPress("i", () => setShowMetadata((s) => !s));
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

  // Both Photo and the mounted Month register Escape listeners on
  // window. Capture phase + stopImmediatePropagation so Photo's
  // handler runs first and Month's is skipped while the modal is
  // open — otherwise one Escape press skips two levels up.
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
