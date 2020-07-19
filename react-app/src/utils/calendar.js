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

const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
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

const sinceEpochYmd = (epoch, now) => {
  const [y1, m1, d1] = epoch;
  const [y2, m2, d2] = now;

  if (y1 > y2 || (y1 == y2 && m1 > m2) || (m1 == m2 && y1 > y2)) {
    return [0, 0, 0];
  }

  const years = y2 - y1;
  const months = (m2 + 12 - m1) % 12;
  const mdays = daysInMonth(y2, (m2 + 11) % 12);
  const days = (d2 + mdays - d1) % mdays;

  const yearOffset = m2 < m1 || (m2 === m1 && d2 < d1) ? -1 : 0;
  const monthOffset = d2 < d1 ? -1 : 0;

  return [years + yearOffset, (months + monthOffset + 12) % 12, days];
};

const daysSinceEpoch = (epoch, now) => {
  const d1 = new Date(...epoch);
  const d2 = new Date(...now);

  const diff = d2 - d1;
  return Math.floor(diff / (24 * 60 * 60 * 1000));
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

  sinceEpochYmd,
  daysSinceEpoch,
};
