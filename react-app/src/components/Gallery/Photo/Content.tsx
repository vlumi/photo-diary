import React from "react";
import styled from "@emotion/styled";

import config from "../../../lib/config";

import type { Gallery } from "../../../models/GalleryModel";
import type { Photo } from "../../../models/PhotoModel";
import type { ZoomState } from "./index";

const Root = styled.div`
  flex-grow: 1;
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin: 5px 0;
`;
const Frame = styled("span", {
  shouldForwardProp: (prop) => prop !== "$width" && prop !== "$height",
})<{ $width: number; $height: number }>`
  border: solid var(--photo-frame-border) 1px;
  padding: 10px;
  background-color: var(--photo-frame-mat);
  flex-grow: 0;
  flex-shrink: 0;
  width: ${(props) => props.$width}px;
  height: ${(props) => props.$height}px;
`;
// Centered so the image (which keeps its scale-1 fit dimensions) sits in
// the middle of the larger frame when zoomed. Clipping happens here so
// the image extends behind the matte, not over it.
const ImageClip = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;
// `touch-action: none` so the browser's default pinch/pan/swipe handling
// doesn't fight our touch handlers. `will-change: transform` lets the
// GPU compositor handle scale/pan without re-rasterising every frame.
const Image = styled("img", {
  shouldForwardProp: (prop) =>
    prop !== "$scale" && prop !== "$x" && prop !== "$y" && prop !== "$grabbing",
})<{ $scale: number; $x: number; $y: number; $grabbing: boolean }>`
  width: ${(props) => props.width};
  height: ${(props) => props.height};
  flex-shrink: 0;
  transform: translate(${(props) => props.$x}px, ${(props) => props.$y}px)
    scale(${(props) => props.$scale});
  transform-origin: center center;
  will-change: transform;
  cursor: ${(props) =>
    props.$scale > 1 ? (props.$grabbing ? "grabbing" : "grab") : "auto"};
  user-select: none;
  -webkit-user-drag: none;
  touch-action: none;
`;

const calculateWidth = (
  photoRatio: number,
  maxWidth: number,
  maxHeight: number,
  maxRatio: number
): number => {
  if (maxRatio > photoRatio) {
    return Math.floor(maxHeight * photoRatio);
  }
  return maxWidth;
};
const calculateHeight = (
  photoRatio: number,
  maxHeight: number,
  maxWidth: number,
  maxRatio: number
): number => {
  if (maxRatio > photoRatio) {
    return maxHeight;
  }
  return Math.floor(maxWidth / photoRatio);
};

// Pan offset is clamped per axis so the scaled image's edge can't cross
// into the frame's content area. When the scaled image fits the frame
// in that axis (frame ≥ scaledImage), no pan is allowed there at all.
const clampOffset = (
  offset: number,
  scaledImageDim: number,
  frameContentDim: number
): number => {
  if (scaledImageDim <= frameContentDim) return 0;
  const limit = (scaledImageDim - frameContentDim) / 2;
  return Math.max(-limit, Math.min(limit, offset));
};

const WHEEL_STEP = 1.1;
const MIN_SCALE = 1;
const MAX_SCALE = 8;
const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));

const touchDistance = (a: React.Touch, b: React.Touch): number =>
  Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

// Cursor/pinch-anchored zoom: shift the translate so that the point at
// `anchorOffset` (relative to the frame center, in screen pixels) ends
// up over the same image pixel after the scale change. Derivation:
//   cursor = frameCenter + (pixel - imageCenter) * s + (tx, ty)
// solving for (tx', ty') at the new scale s' with the same pixel gives
//   (tx', ty') = anchorOffset * (1 - s'/s) + (tx, ty) * (s'/s)
const anchoredTranslate = (
  anchorOffset: number,
  oldTranslate: number,
  oldScale: number,
  newScale: number
): number => {
  const k = newScale / oldScale;
  return anchorOffset * (1 - k) + oldTranslate * k;
};

interface Props {
  gallery: Gallery;
  year: number;
  month: number;
  day: number;
  photo: Photo;
  zoom: ZoomState;
  setZoom: React.Dispatch<React.SetStateAction<ZoomState>>;
}

const Content = ({
  gallery,
  year,
  month,
  day,
  photo,
  zoom,
  setZoom,
}: Props): React.ReactElement => {
  const [dimensions, setDimensions] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const updateDimensions = () => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight });
  };
  React.useEffect(() => {
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  });

  const dragRef = React.useRef<{
    startClientX: number;
    startClientY: number;
    baseX: number;
    baseY: number;
  } | null>(null);
  const pinchRef = React.useRef<{
    startDistance: number;
    startScale: number;
    startX: number;
    startY: number;
    midViewportX: number;
    midViewportY: number;
  } | null>(null);
  const frameRef = React.useRef<HTMLSpanElement | null>(null);
  const [grabbing, setGrabbing] = React.useState(false);

  const photoRatio = photo.ratio();
  const browserScale = window.visualViewport?.scale ?? 1;
  const maxAvailWidth = (dimensions.width - 62) * browserScale;
  const maxAvailHeight = (dimensions.height - 107) * browserScale;
  const maxRatio = maxAvailWidth / maxAvailHeight;
  // Image keeps its natural fit-to-viewport dimensions at every zoom
  // level; the `transform: scale` handles the zoom visually.
  const imageWidth = calculateWidth(
    photoRatio,
    maxAvailWidth,
    maxAvailHeight,
    maxRatio
  );
  const imageHeight = calculateHeight(
    photoRatio,
    maxAvailHeight,
    maxAvailWidth,
    maxRatio
  );
  // On zoom-in the frame widens to the available viewport so portrait-
  // on-landscape can put its empty side margins to use. Height stays
  // at the photo's fit dimension — growing it too would make a
  // landscape photo on a portrait phone snap to nearly full-screen,
  // which is jarring. Frame uses CSS `content-box`, so `width` already
  // refers to the content area (= the clipping rectangle inside the
  // matte).
  const isZoomed = zoom.scale > 1;
  const frameWidth = isZoomed ? maxAvailWidth : imageWidth;
  const frameHeight = imageHeight;

  // Latest dimensions in a ref so the wheel useEffect (registered once)
  // always reads the current values for clamp + anchor math.
  const sizeRef = React.useRef({
    imageWidth,
    imageHeight,
    maxAvailWidth,
    maxAvailHeight,
  });
  sizeRef.current = {
    imageWidth,
    imageHeight,
    maxAvailWidth,
    maxAvailHeight,
  };

  // React attaches `wheel` listeners as passive by default, so
  // `e.preventDefault()` would be a no-op (and Chrome warns on every
  // scroll). Native non-passive listener instead.
  React.useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
      const rect = el.getBoundingClientRect();
      const anchorX = e.clientX - rect.left - rect.width / 2;
      const anchorY = e.clientY - rect.top - rect.height / 2;
      setZoom((z) => {
        const nextScale = clampScale(z.scale * factor);
        if (nextScale === z.scale) return z;
        const nextX = anchoredTranslate(anchorX, z.x, z.scale, nextScale);
        const nextY = anchoredTranslate(anchorY, z.y, z.scale, nextScale);
        const sz = sizeRef.current;
        const nextFrameW = nextScale > 1 ? sz.maxAvailWidth : sz.imageWidth;
        return {
          scale: nextScale,
          x: clampOffset(nextX, sz.imageWidth * nextScale, nextFrameW),
          y: clampOffset(nextY, sz.imageHeight * nextScale, sz.imageHeight),
        };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setZoom]);

  if (!gallery.includesPhoto(year, month, day, photo)) {
    return <i>Empty</i>;
  }

  const path = `${config.PHOTO_ROOT_URL}display/${photo.id()}`;

  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (zoom.scale <= 1) return;
    e.preventDefault();
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      baseX: zoom.x,
      baseY: zoom.y,
    };
    setGrabbing(true);
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startClientX;
    const dy = e.clientY - dragRef.current.startClientY;
    setZoom((z) => ({
      scale: z.scale,
      x: clampOffset(
        dragRef.current!.baseX + dx,
        imageWidth * z.scale,
        frameWidth
      ),
      y: clampOffset(
        dragRef.current!.baseY + dy,
        imageHeight * z.scale,
        frameHeight
      ),
    }));
  };
  const handleMouseUp = () => {
    setGrabbing(false);
    dragRef.current = null;
  };
  const handleMouseLeave = () => {
    if (dragRef.current) {
      setGrabbing(false);
      dragRef.current = null;
    }
  };

  // Two fingers → pinch zoom, anchored at the midpoint between fingers.
  // One finger when already zoomed → drag-to-pan.
  // One finger at scale 1 → no-op here; parent <Swipeable> handles
  // swipe-to-next/prev.
  const handleTouchStart = (e: React.TouchEvent<HTMLImageElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchRef.current = {
        startDistance: touchDistance(t1, t2),
        startScale: zoom.scale,
        startX: zoom.x,
        startY: zoom.y,
        midViewportX: (t1.clientX + t2.clientX) / 2,
        midViewportY: (t1.clientY + t2.clientY) / 2,
      };
      dragRef.current = null;
    } else if (e.touches.length === 1 && zoom.scale > 1) {
      const t = e.touches[0];
      dragRef.current = {
        startClientX: t.clientX,
        startClientY: t.clientY,
        baseX: zoom.x,
        baseY: zoom.y,
      };
    }
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLImageElement>) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const newDistance = touchDistance(e.touches[0], e.touches[1]);
      const nextScale = clampScale(
        pinchRef.current.startScale *
          (newDistance / pinchRef.current.startDistance)
      );
      const rect = frameRef.current?.getBoundingClientRect();
      if (!rect) return;
      const anchorX = pinchRef.current.midViewportX - rect.left - rect.width / 2;
      const anchorY = pinchRef.current.midViewportY - rect.top - rect.height / 2;
      const nextX = anchoredTranslate(
        anchorX,
        pinchRef.current.startX,
        pinchRef.current.startScale,
        nextScale
      );
      const nextY = anchoredTranslate(
        anchorY,
        pinchRef.current.startY,
        pinchRef.current.startScale,
        nextScale
      );
      const nextFrameW = nextScale > 1 ? maxAvailWidth : imageWidth;
      setZoom({
        scale: nextScale,
        x: clampOffset(nextX, imageWidth * nextScale, nextFrameW),
        y: clampOffset(nextY, imageHeight * nextScale, imageHeight),
      });
    } else if (e.touches.length === 1 && dragRef.current) {
      const t = e.touches[0];
      const dx = t.clientX - dragRef.current.startClientX;
      const dy = t.clientY - dragRef.current.startClientY;
      setZoom((z) => ({
        scale: z.scale,
        x: clampOffset(
          dragRef.current!.baseX + dx,
          imageWidth * z.scale,
          frameWidth
        ),
        y: clampOffset(
          dragRef.current!.baseY + dy,
          imageHeight * z.scale,
          frameHeight
        ),
      }));
    }
  };
  const handleTouchEnd = (e: React.TouchEvent<HTMLImageElement>) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) dragRef.current = null;
  };

  return (
    <Root>
      <Frame ref={frameRef} $width={frameWidth} $height={frameHeight}>
        <ImageClip>
          <Image
            src={path}
            alt={photo.id()}
            width={imageWidth}
            height={imageHeight}
            $scale={zoom.scale}
            $x={zoom.x}
            $y={zoom.y}
            $grabbing={grabbing}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            draggable={false}
          />
        </ImageClip>
      </Frame>
    </Root>
  );
};
export default Content;
