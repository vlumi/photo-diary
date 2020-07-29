import PropTypes from "prop-types";

import format from "../lib/format";

const FormatDate = ({ year, month, day }) =>
  format.date({ year, month, day, separator: "-" });

FormatDate.propTypes = {
  year: PropTypes.number,
  month: PropTypes.number,
  day: PropTypes.number,
};
export default FormatDate;
