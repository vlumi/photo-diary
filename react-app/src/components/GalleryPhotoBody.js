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

const GalleryPhotoBody = ({ photo }) => {
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

  const photoRatio =
    photo.dimensions.display.width / photo.dimensions.display.height;

  const maxWidth = dimensions.width - 62;
  const maxHeight = dimensions.height - 112;
  const maxRatio = maxWidth / maxHeight;

  const style = {
    width: calculateWidth(photoRatio, maxWidth, maxHeight, maxRatio),
    height: calculateHeight(photoRatio, maxHeight, maxWidth, maxRatio),
  };
  const path = `${config.PHOTO_ROOT}display/${photo.id}`;

  return (
    <>
      <div className="photo content">
        <span className="photo" style={style}>
          <img src={path} alt={photo.id} style={style} />
        </span>
      </div>
    </>
  );
};
GalleryPhotoBody.propTypes = {
  photo: PropTypes.object.isRequired,
};
export default GalleryPhotoBody;
