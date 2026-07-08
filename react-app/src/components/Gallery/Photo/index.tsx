import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import {
  BsArrowsFullscreen,
  BsBookmarkStar,
  BsEyeSlashFill,
  BsFullscreenExit,
  BsInfoCircleFill,
  BsPencilSquare,
  BsXLg,
} from "react-icons/bs";
import { motion, useAnimationControls, type PanInfo } from "framer-motion";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import Navigation from "./Navigation";
import Content from "./Content";
import MetadataPanel from "./MetadataPanel";

// Editor-tier in-place editor. Lazy so the heavy admin drawer
// doesn't bloat the public chunk — only fetched when an admin /
// gallery-editor clicks the pencil button.
const InlinePhotoDrawer = React.lazy(async () => ({
  default: (await import("../../Manage/PhotoDrawer")).PhotoDrawer,
}));

import filter from "../../../lib/filter";
import useKeyPress from "../../../lib/keypress";
import { useBodyScrollLock } from "../../../lib/useBodyScrollLock";
import galleryPhotosService from "../../../services/gallery-photos";
import {
  useFiltersStore,
  useUserStore,
  useWireNumericRanges,
} from "../../../stores";
import PhotoModel from "../../../models/PhotoModel";

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
// 100 = FullscreenButton top 58 + 34px height + 8px clearance.
const ManageButton = styled(FloatingButton)`
  top: 100px;
  left: 8px;
`;
// 142 = ManageButton top 100 + 34px height + 8px clearance.
const SetIconButton = styled(FloatingButton)`
  top: 142px;
  left: 8px;
`;
const InfoButton = styled(FloatingButton)`
  bottom: 16px;
  right: 16px;
`;
// In-place editor overlay. Centered modal stacked on top of the
// Photo Frame so the photo stays visible underneath (greyed by the
// scrim). Higher z-index than the photo modal's own Backdrop so
// it lands above everything in the photo view.
const EditorBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 20px;
  @media (max-width: 600px) {
    padding: 0;
  }
`;
const EditorFrame = styled.div`
  flex: 1 1 auto;
  max-width: 900px;
  background: var(--primary-background);
  border-radius: 8px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  @media (max-width: 600px) {
    border-radius: 0;
    box-shadow: none;
  }
`;
const EditorLoading = styled.div`
  padding: 24px;
  color: var(--inactive-color);
`;
// "Private in this gallery" badge — surfaces when the user can see
// the photo only because their grant carries `can_see_private` (or
// they're editor/admin). Same floating-button geometry as the other
// overlays; non-interactive (pointer-events: none) since it's a
// label, not a button.
const PrivacyBadge = styled.div`
  position: absolute;
  z-index: 9;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.95);
  background: rgba(0, 0, 0, 0.55);
  border-radius: 12px;
  padding: 4px 10px;
  font-size: 0.75em;
  letter-spacing: 0.02em;
`;
// Author overlay anchored to the bottom-left so it doesn't collide
// with the InfoButton (bottom-right) or the MetadataPanel (anchored
// above the InfoButton). pointer-events: none so the photo
// underneath still accepts clicks / drags.
const AuthorOverlay = styled.div`
  position: absolute;
  z-index: 9;
  left: 16px;
  bottom: 16px;
  pointer-events: none;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(0, 0, 0, 0.45);
  border-radius: 12px;
  padding: 4px 10px;
  font-size: 0.75em;
  letter-spacing: 0.02em;
  max-width: calc(100% - 80px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
// 3-slide carousel (prev / current / next) dragged horizontally so
// the user sees the neighbour peeking from the edge as they swipe.
// The Frame above clips overflow so slides extending past the Frame
// are hidden until peeked into view. touch-action: none — the
// carousel captures both axes (horizontal for nav, vertical for
// swipe-down-to-close).
const CarouselViewport = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  position: relative;
`;
const Track = styled(motion.div)`
  display: flex;
  flex-direction: row;
  width: 300%;
  height: 100%;
  touch-action: none;
`;
// `min-width: 0` so the slide doesn't grow to its content's
// min-content (the photo Frame's explicit width). Without this,
// initial render at a viewport wider than the modal's 1400 max-
// width causes a ResizeObserver feedback loop in Content as the
// slide stays oversized.
const Slide = styled.div`
  flex: 0 0 33.3333%;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

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
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const isAdmin = !!user?.isAdmin();
  // Editor-tier on this gallery (or any global admin) — gates the
  // floating Manage / SetIcon buttons. Server enforces per-request,
  // this is just the rendering hint.
  const canManage = !!user?.isGalleryEditor(gallery.id());
  // In-place editor modal — opens over the public Photo view so
  // editors don't have to navigate away from `/g/` to fix
  // metadata. The "Open in Manage" link inside still takes them
  // to the full /m/photos/<id> surface when they want it.
  const [inlineEditOpen, setInlineEditOpen] = React.useState(false);
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
  useBodyScrollLock();

  const { t } = useTranslation();

  useKeyPress("i", () => setShowMetadata((s) => !s));
  useKeyPress("e", () => {
    if (canManage) setInlineEditOpen((open) => !open);
  });

  // 3-slide carousel: track rests at -1/3 so the middle slide
  // (current photo) is centred in the viewport. Sliding right exposes
  // slot 0 (prev); sliding left exposes slot 2 (next).
  //
  // Neighbors fetched per-photo from the server so the
  // adjacency respects the active filter. `keepPreviousData`
  // holds the previous neighbors object while a navigation
  // refetch is in flight — animated slide-out lands on real
  // adjacent slides instead of flashing empty.
  const filters = useFiltersStore((s) => s.filters);
  const dateRange = useFiltersStore((s) => s.dateRange);
  const wireNumericRanges = useWireNumericRanges();
  const serverFilters = React.useMemo(
    () => filter.toServerFilters(filters),
    [filters]
  );
  const { data: neighbors, isPlaceholderData } = useQuery({
    queryKey: [
      "gallery-photo-neighbors",
      gallery.id(),
      photo.id(),
      serverFilters,
      dateRange,
      wireNumericRanges,
    ],
    queryFn: ({ signal }) =>
      galleryPhotosService.getNeighbors(
        gallery.id(),
        photo.id(),
        { filter: serverFilters, dateRange, numericRanges: wireNumericRanges },
        signal
      ),
    placeholderData: keepPreviousData,
  });
  // Prime the per-id query cache (Gallery/index.tsx reads from
  // `["gallery-photo-by-id", galleryId, photoId, lang]`) with the
  // neighbor photo objects, so prev/next navigation finds the new
  // photo in cache the moment the URL changes. Without this the
  // route re-render hits `isLoading` and renders a bare "Loading"
  // text on the page background — a brief bright-white flash
  // between modal frames.
  const queryClient = useQueryClient();
  React.useEffect(() => {
    if (!neighbors) return;
    const prime = (raw: unknown): void => {
      if (!raw || typeof raw !== "object") return;
      const id = (raw as { id?: unknown }).id;
      if (typeof id !== "string" || !id) return;
      queryClient.setQueryData(
        ["gallery-photo-by-id", gallery.id(), id, lang],
        raw
      );
    };
    prime(neighbors.previous);
    prime(neighbors.next);
    prime(neighbors.first);
    prime(neighbors.last);
  }, [neighbors, queryClient, gallery, lang]);
  const prevPhoto = React.useMemo(
    () =>
      neighbors?.previous ? PhotoModel(neighbors.previous) : undefined,
    [neighbors?.previous]
  );
  const nextPhoto = React.useMemo(
    () => (neighbors?.next ? PhotoModel(neighbors.next) : undefined),
    [neighbors?.next]
  );
  const firstPhoto = React.useMemo(
    () => (neighbors?.first ? PhotoModel(neighbors.first) : undefined),
    [neighbors?.first]
  );
  const lastPhoto = React.useMemo(
    () => (neighbors?.last ? PhotoModel(neighbors.last) : undefined),
    [neighbors?.last]
  );
  const isFirstPhoto = !prevPhoto;
  const isLastPhoto = !nextPhoto;
  const TRACK_REST = "-33.3333%";
  const TRACK_PREV = "0%";
  const TRACK_NEXT = "-66.6667%";
  const trackControls = useAnimationControls();
  // useLayoutEffect: snap the track back to centre synchronously after
  // the photo prop changes, so the new current slide is at viewport
  // x=0 before the browser paints the new frame. A regular useEffect
  // would let one frame paint with the track at its post-animation
  // offset (showing the new "prev" or "next" slide where the user
  // expects the new current) — the flash the user reported.
  React.useLayoutEffect(() => {
    trackControls.set({ x: TRACK_REST, y: 0 });
  }, [photo.id(), trackControls]);

  const SWIPE_COMMIT_RATIO = 0.3;
  const SWIPE_COMMIT_VELOCITY = 500;
  const VERTICAL_CLOSE_RATIO = 0.2;
  const SPRING = { type: "spring", stiffness: 400, damping: 40 } as const;
  const SLIDE = { duration: 0.18, ease: "easeOut" } as const;

  // Gate arrow-key / swipe navigation on having FRESH neighbors for
  // the current photo. `keepPreviousData` keeps the previous photo's
  // neighbors visible while the new photo's fetch is in flight so
  // the slide-out lands on a real neighbor thumbnail — but the
  // navigation callbacks were reading those stale neighbors too. A
  // second arrow press within that ~50–100 ms fetch window would
  // navigate against the OLD photo's prev/next: same-photo "double
  // transition" on repeated Right, or a skipped photo on
  // Right-then-Left. Once fresh neighbors arrive, isPlaceholderData
  // flips false and navigation re-enables.
  const canNavigate = !isPlaceholderData;

  const animateToPrev = React.useCallback(async () => {
    if (!prevPhoto || !canNavigate) return;
    await trackControls.start({ x: TRACK_PREV, transition: SLIDE });
    navigate(prevPhoto.path(gallery));
  }, [prevPhoto, canNavigate, gallery, navigate, trackControls]);

  const animateToNext = React.useCallback(async () => {
    if (!nextPhoto || !canNavigate) return;
    await trackControls.start({ x: TRACK_NEXT, transition: SLIDE });
    navigate(nextPhoto.path(gallery));
  }, [nextPhoto, canNavigate, gallery, navigate, trackControls]);

  const handlMoveToFirst = () => {
    if (!canNavigate) return;
    if (firstPhoto && firstPhoto.id() !== photo.id()) {
      navigate(firstPhoto.path(gallery));
    }
  };
  const handlMoveToLast = () => {
    if (!canNavigate) return;
    if (lastPhoto && lastPhoto.id() !== photo.id()) {
      navigate(lastPhoto.path(gallery));
    }
  };

  const handleClose = React.useCallback(() => {
    navigate(gallery.path(year, month));
  }, [gallery, year, month, navigate]);

  const animateClose = React.useCallback(async () => {
    await trackControls.start({
      y: window.innerHeight,
      transition: SLIDE,
    });
    handleClose();
  }, [trackControls, handleClose]);

  // Photo and the underlying Month both register window keydown
  // listeners for Escape / Arrow / Home / End. Capture phase +
  // `stopImmediatePropagation` so Photo's handlers run first and
  // Month's bubble-phase ones are skipped while the modal is open —
  // otherwise one Arrow press would navigate the photo AND the month
  // (closing the modal), and Escape would skip two levels up.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Stacked-modal deference: when the in-place editor is open
      // on top of the Photo modal, let its own Escape handler win
      // — otherwise the capture-phase listener here would close
      // the photo modal and the editor with it (the editor is a
      // child of this component). Same shape as FilterModal ↔
      // Builder's `subModalKey` check in the gallery filter
      // widget.
      if (inlineEditOpen) return;
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          e.stopImmediatePropagation();
          handleClose();
          break;
        case "Home":
          e.preventDefault();
          e.stopImmediatePropagation();
          handlMoveToFirst();
          break;
        case "End":
          e.preventDefault();
          e.stopImmediatePropagation();
          handlMoveToLast();
          break;
        case "ArrowLeft":
          e.preventDefault();
          e.stopImmediatePropagation();
          animateToPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          e.stopImmediatePropagation();
          animateToNext();
          break;
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [handleClose, animateToPrev, animateToNext, inlineEditOpen]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    const verticalIntent = Math.abs(info.offset.y) > Math.abs(info.offset.x);
    if (verticalIntent) {
      const closeByDistance = info.offset.y > height * VERTICAL_CLOSE_RATIO;
      const closeByVelocity = info.velocity.y > SWIPE_COMMIT_VELOCITY;
      if (closeByDistance || closeByVelocity) {
        animateClose();
        return;
      }
      trackControls.start({ y: 0, transition: SPRING });
      return;
    }
    const passedDistance = Math.abs(info.offset.x) >= width * SWIPE_COMMIT_RATIO;
    const passedVelocity = Math.abs(info.velocity.x) >= SWIPE_COMMIT_VELOCITY;
    const goingPrev = info.offset.x > 0;
    if ((passedDistance || passedVelocity) && goingPrev && prevPhoto) {
      animateToPrev();
      return;
    }
    if ((passedDistance || passedVelocity) && !goingPrev && nextPhoto) {
      animateToNext();
      return;
    }
    trackControls.start({ x: TRACK_REST, y: 0, transition: SPRING });
  };

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
        {gallery.breadcrumb({
          year,
          month,
          day,
          position: neighbors?.position,
          lang,
        })}{" "}
        — {t("nav-gallery")}
      </title>
      <Frame>
        <Navigation
          gallery={gallery}
          photo={photo}
          lang={lang}
          previousPhoto={prevPhoto}
          nextPhoto={nextPhoto}
          firstPhoto={firstPhoto}
          lastPhoto={lastPhoto}
          position={neighbors?.position}
          total={neighbors?.total ?? 0}
          onPrev={animateToPrev}
          onNext={animateToNext}
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
        {canManage && (
          <ManageButton
            type="button"
            onClick={() => setInlineEditOpen(true)}
            aria-label={String(t("manage-this-photo"))}
            title={String(t("manage-this-photo"))}
          >
            <BsPencilSquare />
          </ManageButton>
        )}
        {canManage && (
          <SetIconButton
            type="button"
            onClick={() =>
              navigate(
                `/m/g/${gallery.id()}?openIcon=${encodeURIComponent(photo.id())}`
              )
            }
            aria-label={String(t("set-as-gallery-icon"))}
            title={String(t("set-as-gallery-icon"))}
          >
            <BsBookmarkStar />
          </SetIconButton>
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
        {photo.author() && (
          <AuthorOverlay aria-label={t("photo-author")}>
            © {photo.author()}
          </AuthorOverlay>
        )}
        {photo.isPrivate() && (
          <PrivacyBadge aria-label={String(t("photo-private-badge"))}>
            <BsEyeSlashFill aria-hidden />
            {t("photo-private-badge")}
          </PrivacyBadge>
        )}
        <CarouselViewport>
          <Track
            drag
            dragDirectionLock
            dragConstraints={{
              // Constraints are absolute pixel offsets from the
              // Track's translate origin. The Track rests at
              // motion.x = -window.innerWidth (the -33.3333% of its
              // 300% width that centres slot 1). Range: TRACK_NEXT
              // (-2W) ↔ TRACK_PREV (0). At edges, lock at rest so
              // the empty slot can't be pulled into view.
              left: nextPhoto ? -2 * window.innerWidth : -window.innerWidth,
              right: prevPhoto ? 0 : -window.innerWidth,
              top: 0,
              bottom: window.innerHeight,
            }}
            dragElastic={0.3}
            dragMomentum={false}
            animate={trackControls}
            initial={{ x: TRACK_REST, y: 0 }}
            onDragEnd={handleDragEnd}
          >
            <Slide>
              {prevPhoto && (
                <Content
                  gallery={gallery}
                  year={prevPhoto.ymd()[0]}
                  month={prevPhoto.ymd()[1]}
                  day={prevPhoto.ymd()[2]}
                  photo={prevPhoto}
                />
              )}
            </Slide>
            <Slide>
              <Content
                gallery={gallery}
                year={year}
                month={month}
                day={day}
                photo={photo}
              />
            </Slide>
            <Slide>
              {nextPhoto && (
                <Content
                  gallery={gallery}
                  year={nextPhoto.ymd()[0]}
                  month={nextPhoto.ymd()[1]}
                  day={nextPhoto.ymd()[2]}
                  photo={nextPhoto}
                />
              )}
            </Slide>
          </Track>
        </CarouselViewport>
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
      {inlineEditOpen && (
        <EditorBackdrop
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setInlineEditOpen(false);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <EditorFrame>
            <React.Suspense fallback={<EditorLoading>{t("loading")}</EditorLoading>}>
              <InlinePhotoDrawer
                photoId={photo.id()}
                galleryId={gallery.id()}
                onClose={() => setInlineEditOpen(false)}
                mode="inline"
              />
            </React.Suspense>
          </EditorFrame>
        </EditorBackdrop>
      )}
    </Backdrop>
  );
};
export default Photo;
