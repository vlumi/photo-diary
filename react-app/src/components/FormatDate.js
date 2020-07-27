import PropTypes from "prop-types";

import format from "../utils/format";

const FormatDate = ({ year, month, day }) =>
  format.date({ year, month, day, separator: "-" });

FormatDate.propTypes = {
  year: PropTypes.number,
  month: PropTypes.number,
  day: PropTypes.number,
};
export default FormatDate;
