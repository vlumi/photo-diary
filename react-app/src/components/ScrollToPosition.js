import React, { useEffect, Fragment } from "react";
import PropTypes from "prop-types";
import { withRouter } from "react-router-dom";

const ScrollToPosition = ({ history, children, scrollState }) => {
  useEffect(() => {
    const unlisten = history.listen(() => {
      const y = scrollState.get(window.location.pathname);
      setTimeout(() => window.scrollTo(0, y), 0);
    });
    return () => {
      unlisten();
    };
  }, [history, scrollState]);

  return <Fragment>{children}</Fragment>;
};
ScrollToPosition.propTypes = {
  history: PropTypes.any,
  children: PropTypes.any,
  scrollState: PropTypes.object.isRequired,
};
export default withRouter(ScrollToPosition);
