import React from "react";
import PropTypes from "prop-types";

import config from "../utils/config";

function calculateWidth(photoRatio, maxWidth, maxHeight, maxRatio) {
  if (maxRatio > photoRatio) {
    return Math.floor(maxHeight * photoRatio);
  }
  return maxWidth;
}
function calculateHeight(photoRatio, maxHeight, maxWidth, maxRatio) {
  if (maxRatio > photoRatio) {
    return maxHeight;
  }
  return Math.floor(maxWidth / photoRatio);
}

const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.getElementById("root").requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};

const GalleryPhotoContent = ({ photo }) => {
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

  const getScale = () => {
    if (window.visualViewport) {
      return window.visualViewport.scale;
    }
    return 1;
  };
  const renderPhoto = (photo) => {
    const photoRatio =
      photo.dimensions.display.width / photo.dimensions.display.height;

    const scale = getScale();
    const maxWidth = (dimensions.width - 62) * scale;
    const maxHeight = (dimensions.height - 82) * scale;
    const maxRatio = maxWidth / maxHeight;

    const style = {
      width: calculateWidth(photoRatio, maxWidth, maxHeight, maxRatio),
      height: calculateHeight(photoRatio, maxHeight, maxWidth, maxRatio),
    };
    const path = `${config.PHOTO_ROOT}display/${photo.id()}`;

    return (
      <span className="photo" style={style}>
        <img
          src={path}
          alt={photo.id()}
          style={style}
          onClick={toggleFullScreen}
        />
      </span>
    );
  };

  return (
    <>
      <div className="photo">{renderPhoto(photo)}</div>
    </>
  );
};
GalleryPhotoContent.propTypes = {
  photo: PropTypes.object.isRequired,
};
export default GalleryPhotoContent;
