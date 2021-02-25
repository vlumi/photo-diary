import * as React from "react";
import PropTypes from "prop-types";
// import FlagIconFactory from "react-flag-icon-css";

// const FlagIcon = FlagIconFactory(React, { useCssModules: false });

const FlagIcon = ({ code }) => {
  /* eslint-disable no-console */
  console.log("TODO: add flag for " + code);
  /* eslint-enable no-console */
  return <></>;
};
FlagIcon.propTypes = {
  code: PropTypes.string.isRequired,
};
export default FlagIcon;
