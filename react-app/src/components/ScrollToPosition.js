import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { useLocation } from "react-router-dom";

const ScrollToPosition = ({ children, scrollState }) => {
  let location = useLocation();
  useEffect(() => {
    const y = scrollState.get(location.pathname);
    setTimeout(() => window.scrollTo(0, y), 0);
  }, [location]);
  return <>{children}</>;
};
ScrollToPosition.propTypes = {
  children: PropTypes.any,
  scrollState: PropTypes.object.isRequired,
};
export default ScrollToPosition;
