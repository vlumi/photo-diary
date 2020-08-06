import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import config from "../../../lib/config";

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
const Frame = styled.span`
  border: solid #004 1px;
  padding: 10px;
  background-color: #bbb;
  flex-grow: 0;
  flex-shrink: 0;
  width: ${(props) => props.width};
  height: ${(props) => props.height};
`;
const Image = styled.img`
  width: ${(props) => props.width};
  height: ${(props) => props.height};
`;

const calculateWidth = (photoRatio, maxWidth, maxHeight, maxRatio) => {
  if (maxRatio > photoRatio) {
    return Math.floor(maxHeight * photoRatio);
  }
  return maxWidth;
};
const calculateHeight = (photoRatio, maxHeight, maxWidth, maxRatio) => {
  if (maxRatio > photoRatio) {
    return maxHeight;
  }
  return Math.floor(maxWidth / photoRatio);
};

const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.getElementById("root").requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};

const Content = ({ gallery, year, month, day, photo }) => {
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

  const getScale = () => {
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
      <Frame width={width} height={height}>
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
Content.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  photo: PropTypes.object.isRequired,
};
export default Content;
