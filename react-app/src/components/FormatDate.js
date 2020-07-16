import PropTypes from "prop-types";

const pad = (value, length) => String(value).padStart(length, "0");

const FormatDate = ({ year, month, day }) => {
  if (year && month && day) {
    return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
  }
  if (year && month) {
    return `${pad(year, 4)}-${pad(month, 2)}`;
  }
  if (month && day) {
    return `${pad(month, 2)}-${pad(day, 2)}`;
  }
  if (year) {
    return pad(year, 4);
  }
  if (month) {
    return pad(month, 2);
  }
  if (day) {
    return pad(day, 2);
  }
  return "";
};
FormatDate.propTypes = {
  year: PropTypes.number,
  month: PropTypes.number,
  day: PropTypes.number,
};
export default FormatDate;
