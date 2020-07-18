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

const compare = (a, b) => {
  if (typeof a !== "object" && typeof b !== "object") {
    return undefined;
  }
  if (typeof a !== "object") {
    return undefined;
  }
  if (typeof b !== "object") {
    return undefined;
  }
  const maxLength = Math.max(a.length, b.length);
  for (const i in [...Array(maxLength).keys()]) {
    if (b.length <= i) {
      return -1;
    }
    if (a.length <= i) {
      return 1;
    }
    if (a[i] > b[i]) {
      return -1;
    }
    if (a[i] < b[i]) {
      return 1;
    }
  }
  return 0;
};

const previousYear = (year) => year - 1;
const previousMonth = (year, month) => {
  if (month > 1) {
    return [year, month - 1];
  }
  return [year - 1, 12];
};
const previousDay = (year, month, day) => {
  if (day > 1) {
    return [year, month, day - 1];
  }
  if (month > 1) {
    return [year, month - 1, daysInMonth(year, month)];
  }
  return [year - 1, 12, daysInMonth(year, 12)];
};

const nextYear = (year) => year + 1;
const nextMonth = (year, month) => {
  if (month < 12) {
    return [year, month + 1];
  }
  return [year + 1, 1];
};
const nextDay = (year, month, day) => {
  if (day < daysInMonth(year, month)) {
    return [year, month, day + 1];
  }
  if (month < 12) {
    return [year, month + 1, 1];
  }
  return [year + 1, 1, 1];
};

export default {
  formatDate,

  daysInMonth,
  months,
  monthDays,
  daysOfWeek,
  dayOfWeek,
  monthGrid,

  compare,

  previousYear,
  previousMonth,
  previousDay,
  nextYear,
  nextMonth,
  nextDay,
};
