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

const GalleryPhotoContent = ({ gallery, year, month, day, photo }) => {
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
  const renderPhoto = (photo) => {
    const photoRatio = photo.ratio();
    const scale = getScale();
    const maxWidth = (dimensions.width - 62) * scale;
    const maxHeight = (dimensions.height - 107) * scale;
    const maxRatio = maxWidth / maxHeight;

    const style = {
      width: calculateWidth(photoRatio, maxWidth, maxHeight, maxRatio),
      height: calculateHeight(photoRatio, maxHeight, maxWidth, maxRatio),
    };
    const path = `${config.PHOTO_ROOT_URL}display/${photo.id()}`;

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
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  photo: PropTypes.object.isRequired,
};
export default GalleryPhotoContent;
