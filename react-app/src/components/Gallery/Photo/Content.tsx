import React from "react";
import styled from "@emotion/styled";

import config from "../../../lib/config";

import type { Gallery } from "../../../models/GalleryModel";
import type { Photo } from "../../../models/PhotoModel";

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
  border: solid var(--primary-color) 1px;
  padding: 10px;
  background-color: var(--inactive-color);
  flex-grow: 0;
  flex-shrink: 0;
  width: ${(props) => props.$width}px;
  height: ${(props) => props.$height}px;
`;
const Image = styled.img`
  width: ${(props) => props.width};
  height: ${(props) => props.height};
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

const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.getElementById("root")?.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};

interface Props {
  gallery: Gallery;
  year: number;
  month: number;
  day: number;
  photo: Photo;
}

const Content = ({
  gallery,
  year,
  month,
  day,
  photo,
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

  if (!gallery.includesPhoto(year, month, day, photo)) {
    return <i>Empty</i>;
  }

  const getScale = (): number => {
    if (window.visualViewport) {
      return window.visualViewport.scale;
    }
    return 1;
  };

  const photoRatio = photo.ratio();
  const scale = getScale();
  const maxWidth = (dimensions.width - 62) * scale;
  const maxHeight = (dimensions.height - 107) * scale;
  const maxRatio = maxWidth / maxHeight;

  const path = `${config.PHOTO_ROOT_URL}display/${photo.id()}`;
  const width = calculateWidth(photoRatio, maxWidth, maxHeight, maxRatio);
  const height = calculateHeight(photoRatio, maxHeight, maxWidth, maxRatio);

  return (
    <Root>
      <Frame $width={width} $height={height}>
        <Image
          src={path}
          alt={photo.id()}
          width={width}
          height={height}
          onClick={toggleFullScreen}
        />
      </Frame>
    </Root>
  );
};
export default Content;
