import * as React from "react";
import PropTypes from "prop-types";
import * as EmojiFlags from "emoji-flags";

const FlagIcon = ({ code }) => {
  return <>{EmojiFlags.countryCode(code).emoji}</>;
};
FlagIcon.propTypes = {
  code: PropTypes.string.isRequired,
};
export default FlagIcon;
