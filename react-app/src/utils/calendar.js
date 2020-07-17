import config from "./config";

const formatDate = ({ year, month, day, separator = "-" }) => {
  const pad = (value, length) => String(value).padStart(length, "0");

  const parts = [];
  if (year) {
    parts.push(pad(year, 4));
  }
  if (month) {
    parts.push(pad(month, 2));
  }
  if (day) {
    parts.push(pad(day, 2));
  }
  return parts.join(separator);
};

const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

const getMonths = () => Array.from(Array(13).keys()).slice(1);

const getMonthDays = (year, month) =>
  Array.from(Array(getDaysInMonth(year, month) + 1).keys()).slice(1);

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const getDaysOfWeek = () =>
  Array(7)
    .fill(0)
    .map((x, index) => DOW[(index + config.FIRST_WEEKDAY) % 7]);

const getMonthGrid = (year, month) => {
  const days = getMonthDays(year, month);
  const firstDow = new Date(year, month - 1, 1).getDay();

  const result = [];
  let row = 0;
  let col = (firstDow + 7 - config.FIRST_WEEKDAY) % 7;
  days.forEach((day) => {
    result[row] = result[row] || Array(7).fill(0);
    result[row][col] = day;
    col = col + 1;
    if (col === 7) {
      col = 0;
      row++;
    }
  });
  return result;
};

export default {
  formatDate,

  getDaysInMonth,
  getMonths,
  getMonthDays,
  getDaysOfWeek,
  getMonthGrid,
};
