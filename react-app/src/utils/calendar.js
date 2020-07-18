import config from "./config";

const format = ({ year, month, day, separator = "-" }) => {
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

const daysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

const months = () => Array.from(Array(13).keys()).slice(1);

const monthDays = (year, month) =>
  Array.from(Array(daysInMonth(year, month) + 1).keys()).slice(1);

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const daysOfWeek = () =>
  Array(7)
    .fill(0)
    .map((x, index) => DOW[(index + config.FIRST_WEEKDAY) % 7]);
const dayOfWeek = (year, month, day) => {
  return DOW[new Date(year, month - 1, day).getDay()];
};

const monthGrid = (year, month) => {
  const days = monthDays(year, month);
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
  format,

  daysInMonth,
  months,
  monthDays,
  daysOfWeek,
  dayOfWeek,
  monthGrid,
};
