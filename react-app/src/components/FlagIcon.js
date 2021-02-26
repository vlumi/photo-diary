import PropTypes from "prop-types";
import * as React from "react";
import ReactCountryFlag from "react-country-flag";

const FlagIcon = ({ code }) => {
  return <ReactCountryFlag countryCode={code} svg />;
};
FlagIcon.propTypes = {
  code: PropTypes.string.isRequired,
};
export default FlagIcon;
