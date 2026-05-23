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
  align-items: flex-start;
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
  overflow: hidden;
`;
// `touch-action: none` so the browser's default pinch/pan/swipe handling
// doesn't fight our touch handlers — without it, the iOS browser
// intercepts two-finger pinch as page zoom and our handlers never fire.
// `will-change: transform` so the GPU compositor handles live scale/pan
// without re-rasterising on every frame.
const Image = styled("img", {
  shouldForwardProp: (prop) =>
    prop !== "$scale" && prop !== "$x" && prop !== "$y" && prop !== "$grabbing",
})<{ $scale: number; $x: number; $y: number; $grabbing: boolean }>`
  width: ${(props) => props.width};
  height: ${(props) => props.height};
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

// At scale S the rendered image is S× the frame dimensions, so the pan
// offset can go up to ±(S - 1) × dim / 2 in each axis before the image
// edge crosses into the frame interior.
const clampOffset = (
  offset: number,
  scale: number,
  dimension: number
): number => {
  if (scale <= 1) return 0;
  const limit = ((scale - 1) * dimension) / 2;
  return Math.max(-limit, Math.min(limit, offset));
};

const WHEEL_STEP = 1.1;
const MIN_SCALE = 1;
const MAX_SCALE = 8;
const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));

const touchDistance = (a: React.Touch, b: React.Touch): number =>
  Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

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
  } | null>(null);
  const frameRef = React.useRef<HTMLSpanElement | null>(null);
  const [grabbing, setGrabbing] = React.useState(false);

  // Dimensions and computed render size live in refs so the wheel
  // useEffect (which must be registered before the early return below
  // to keep hook order stable) can read the current values without
  // re-binding on every photo/resize.
  const photoRatio = photo.ratio();
  const browserScale = window.visualViewport?.scale ?? 1;
  const maxWidth = (dimensions.width - 62) * browserScale;
  const maxHeight = (dimensions.height - 107) * browserScale;
  const maxRatio = maxWidth / maxHeight;
  const width = calculateWidth(photoRatio, maxWidth, maxHeight, maxRatio);
  const height = calculateHeight(photoRatio, maxHeight, maxWidth, maxRatio);
  const widthRef = React.useRef(width);
  const heightRef = React.useRef(height);
  widthRef.current = width;
  heightRef.current = height;

  // React attaches `wheel` listeners as passive by default, so
  // `e.preventDefault()` would be a no-op (and Chrome warns on every
  // scroll). Native non-passive listener instead.
  React.useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
      setZoom((z) => {
        const nextScale = clampScale(z.scale * factor);
        return {
          scale: nextScale,
          x: clampOffset(z.x, nextScale, widthRef.current),
          y: clampOffset(z.y, nextScale, heightRef.current),
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
      x: clampOffset(dragRef.current!.baseX + dx, z.scale, width),
      y: clampOffset(dragRef.current!.baseY + dy, z.scale, height),
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

  // Two fingers → pinch zoom (scale relative to initial distance).
  // One finger when already zoomed → drag-to-pan.
  // One finger at scale 1 → no-op here; the parent <Swipeable> handles
  // swipe-to-next/prev.
  const handleTouchStart = (e: React.TouchEvent<HTMLImageElement>) => {
    if (e.touches.length === 2) {
      pinchRef.current = {
        startDistance: touchDistance(e.touches[0], e.touches[1]),
        startScale: zoom.scale,
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
      setZoom((z) => ({
        scale: nextScale,
        x: clampOffset(z.x, nextScale, width),
        y: clampOffset(z.y, nextScale, height),
      }));
    } else if (e.touches.length === 1 && dragRef.current) {
      const t = e.touches[0];
      const dx = t.clientX - dragRef.current.startClientX;
      const dy = t.clientY - dragRef.current.startClientY;
      setZoom((z) => ({
        scale: z.scale,
        x: clampOffset(dragRef.current!.baseX + dx, z.scale, width),
        y: clampOffset(dragRef.current!.baseY + dy, z.scale, height),
      }));
    }
  };
  const handleTouchEnd = (e: React.TouchEvent<HTMLImageElement>) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) dragRef.current = null;
  };

  return (
    <Root>
      <Frame ref={frameRef} $width={width} $height={height}>
        <Image
          src={path}
          alt={photo.id()}
          width={width}
          height={height}
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
      </Frame>
    </Root>
  );
};
export default Content;
