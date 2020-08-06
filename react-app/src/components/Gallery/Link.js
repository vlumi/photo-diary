import React from "react";
import PropTypes from "prop-types";
import { Link as ReactLink } from "react-router-dom";

const Link = ({
  children,
  className,
  gallery,
  year,
  month,
  photo,
  day,
  context,
}) => {
  if (gallery && context === "stats") {
    return (
      <ReactLink className={className} to={gallery.statsPath()}>
        {children}
      </ReactLink>
    );
  }
  if (photo) {
    return (
      <ReactLink className={className} to={photo.path(gallery)}>
        {children}
      </ReactLink>
    );
  }
  if (!gallery) {
    return (
      <ReactLink className={className} to="/g">
        {children}
      </ReactLink>
    );
  }
  const path = gallery.path(year, month, day);
  return (
    <ReactLink className={className} to={path}>
      {children}
    </ReactLink>
  );
};

Link.propTypes = {
  children: PropTypes.any.isRequired,
  className: PropTypes.string,
  gallery: PropTypes.object,
  year: PropTypes.number,
  month: PropTypes.number,
  day: PropTypes.number,
  photo: PropTypes.object,
  context: PropTypes.string,
};
export default Link;
