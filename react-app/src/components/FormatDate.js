import PropTypes from "prop-types";

import calendar from "../utils/calendar";

const FormatDate = ({ year, month, day }) =>
  calendar.formatDate({ year, month, day, separator: "-" });

FormatDate.propTypes = {
  year: PropTypes.number,
  month: PropTypes.number,
  day: PropTypes.number,
};
export default FormatDate;
