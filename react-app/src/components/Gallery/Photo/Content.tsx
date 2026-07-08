import React from "react";
import styled from "@emotion/styled";

import config from "../../../lib/config";

import type { Gallery } from "../../../models/GalleryModel";
import type { Photo } from "../../../models/PhotoModel";

// flex-start so the matte sits just below the Navigation bar with
// minimal top breathing; padding-bottom keeps room at the bottom
// for the floating info button. `min-width: 0` escapes the flex-
// item default `min-width: auto`; without it Root grows to fit the
// photo Frame's explicit width and the parent ResizeObserver
// re-converges via a multi-frame "stretch then shrink" animation.
const Root = styled.div`
  flex-grow: 1;
  min-width: 0;
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  justify-content: center;
  overflow: hidden;
  padding: 8px 0 24px;
  box-sizing: border-box;
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
const ImageClip = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;
// HTML width/height attrs drive the box so the browser builds the
// aspect-ratio reservation from them — keeps the frame from
// popping when the source bytes land.
const Image = styled.img`
  flex-shrink: 0;
  user-select: none;
  -webkit-user-drag: none;
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

interface Props {
  gallery: Gallery;
  year: number;
  month: number;
  day: number;
  photo: Photo;
}

const Content = ({ photo }: Props): React.ReactElement => {
  // Measure the actual container, not the viewport — the modal
  // Frame caps at 1400px so wide-screen landscapes would overshoot.
  // useLayoutEffect runs the corrective measurement before paint so
  // the initial render doesn't flash the fallback dimensions.
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  React.useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const photoRatio = photo.ratio();
  const browserScale = window.visualViewport?.scale ?? 1;
  // FRAME_CHROME = the photo frame's matte+border (10 padding +
  // 1 border each side). H_BREATHING = horizontal side breathing.
  // ROOT_PADDING_V = Root's `padding: 8 0 24` (which the
  // border-box `dimensions.height` includes).
  const FRAME_CHROME = 22;
  const H_BREATHING = 16;
  const ROOT_PADDING_V = 32;
  const maxAvailWidth =
    (dimensions.width - FRAME_CHROME - H_BREATHING) * browserScale;
  const maxAvailHeight =
    (dimensions.height - FRAME_CHROME - ROOT_PADDING_V) * browserScale;
  const maxRatio = maxAvailWidth / maxAvailHeight;
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

  const renditions = photo.renditions();
  const naturalWidthFor = (maxDim: number): number =>
    photoRatio >= 1 ? maxDim : Math.round(maxDim * photoRatio);
  const sortedDims = [...renditions].sort((a, b) => a - b);
  const fallbackDim = sortedDims.at(-1) ?? 1500;
  const urlFor = (dim: number): string =>
    `${config.PHOTO_ROOT_URL}display/${dim}/${photo.id()}`;
  const path = urlFor(fallbackDim);
  const srcSet = sortedDims
    .map((dim) => `${urlFor(dim)} ${naturalWidthFor(dim)}w`)
    .join(", ");

  return (
    <Root ref={rootRef}>
      <Frame $width={imageWidth} $height={imageHeight}>
        <ImageClip>
          <Image
            key={photo.id()}
            src={path}
            srcSet={srcSet || undefined}
            sizes={srcSet ? "100vw" : undefined}
            alt={photo.id()}
            width={imageWidth}
            height={imageHeight}
            draggable={false}
          />
        </ImageClip>
      </Frame>
    </Root>
  );
};
export default Content;
