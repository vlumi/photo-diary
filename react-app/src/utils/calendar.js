import config from "./config";

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

const formatDate = ({ year, month, day, divider = "-" }) => {
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
  return parts.join(divider);
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

const firstYear = (gallery) => {
  if (!("photos" in gallery)) {
    return undefined;
  }
  return Math.min(...Object.keys(gallery.photos));
};
const firstYearMonth = (gallery) => {
  const year = firstYear(gallery);
  if (!year || !(year in gallery.photos)) {
    return [undefined, undefined];
  }
  return [year, Math.min(...Object.keys(gallery.photos[year]))];
};
const firstYearMonthDay = (gallery) => {
  const [year, month] = firstYearMonth(gallery);
  if (
    !year ||
    !month ||
    !(year in gallery.photos) ||
    !(month in gallery.photos[year])
  ) {
    return [undefined, undefined, undefined];
  }
  return [year, month, Math.min(...Object.keys(gallery.photos[year][month]))];
};
const lastYear = (gallery) => {
  if (!("photos" in gallery)) {
    return undefined;
  }
  return Math.max(...Object.keys(gallery.photos));
};
const lastYearMonth = (gallery) => {
  const year = lastYear(gallery);
  if (!year || !(year in gallery.photos)) {
    return [undefined, undefined];
  }
  return [year, Math.max(...Object.keys(gallery.photos[year]))];
};
const lastYearMonthDay = (gallery) => {
  const [year, month] = lastYearMonth(gallery);
  if (
    !year ||
    !month ||
    !(year in gallery.photos) ||
    !(month in gallery.photos[year])
  ) {
    return [undefined, undefined, undefined];
  }
  return [year, month, Math.max(...Object.keys(gallery.photos[year][month]))];
};

const isFirstYear = (gallery, currentYear) => {
  const year = firstYear(gallery);
  return !year || currentYear === year;
};
const isFirstYearMonth = (gallery, currentYear, currentMonth) => {
  const [year, month] = firstYearMonth(gallery);
  return !year || !month || (currentYear === year && currentMonth === month);
};
const isFirstYearMonthDay = (
  gallery,
  currentYear,
  currentMonth,
  currentDay
) => {
  const [year, month, day] = firstYearMonthDay(gallery);
  return (
    !year ||
    !month ||
    !day ||
    currentYear < year ||
    (currentYear === year &&
      (currentMonth < month || (currentMonth === month && currentDay <= day)))
  );
};
const isLastYear = (gallery, currentYear) => {
  const year = lastYear(gallery);
  return !year || currentYear === year;
};
const isLastYearMonth = (gallery, currentYear, currentMonth) => {
  const [year, month] = lastYearMonth(gallery);
  return !year || !month || (currentYear === year && currentMonth === month);
};
const isLastYearMonthDay = (gallery, currentYear, currentMonth, currentDay) => {
  const [year, month, day] = lastYearMonthDay(gallery);
  return (
    !year ||
    !month ||
    !day ||
    currentYear > year ||
    (currentYear === year &&
      (currentMonth > month || (currentMonth === month && currentDay >= day)))
  );
};

const previousYear = (gallery, currentYear) => {
  if (!("photos" in gallery)) {
    return undefined;
  }
  const previousYears = Object.keys(gallery.photos).filter(
    (year) => year < currentYear
  );
  if (previousYears.length === 0) {
    return currentYear - 1;
  }
  return Math.max(...previousYears);
};
const previousYearMonth = (gallery, currentYear, currentMonth) => {
  if (!("photos" in gallery)) {
    return undefined;
  }
  let year = currentYear;
  let month = currentMonth;
  while (!isFirstYearMonth(gallery, year, month)) {
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
    if (year in gallery.photos && month in gallery.photos[year]) {
      return [year, month];
    }
  }
  if (currentMonth > 1) {
    return [currentYear, currentMonth - 1];
  }
  return [currentYear - 1, 12];
};
const previousYearMonthDay = (
  gallery,
  currentYear,
  currentMonth,
  currentDay
) => {
  if (!("photos" in gallery)) {
    return undefined;
  }
  let year = currentYear;
  let month = currentMonth;
  let day = currentDay;
  while (!isFirstYearMonthDay(gallery, year, month)) {
    day--;
    if (day === 0) {
      month--;
      if (month === 0) {
        month = 12;
        year--;
      }
      day = getDaysInMonth(year, month);
    }
    if (
      year in gallery.photos &&
      month in gallery.photos[year] &&
      day in gallery.photos[year][month]
    ) {
      return [year, month, day];
    }
  }
  if (currentDay > 1) {
    return [currentYear, currentMonth, currentDay - 1];
  }
  if (currentMonth > 1) {
    return [
      currentYear,
      currentMonth - 1,
      getDaysInMonth(currentYear, currentMonth - 1),
    ];
  }
  return [currentYear - 1, 12, getDaysInMonth(currentYear - 1, 11)];
};
const nextYear = (gallery, currentYear) => {
  if (!("photos" in gallery)) {
    return undefined;
  }
  const nextYears = Object.keys(gallery.photos).filter(
    (year) => year > currentYear
  );
  if (nextYears.length < 1) {
    return currentYear + 1;
  }
  return Math.min(...nextYears);
};
const nextYearMonth = (gallery, currentYear, currentMonth) => {
  if (!("photos" in gallery)) {
    return undefined;
  }
  let year = currentYear;
  let month = currentMonth;
  while (!isLastYearMonth(gallery, year, month)) {
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
    if (year in gallery.photos && month in gallery.photos[year]) {
      return [year, month];
    }
  }
  if (currentMonth < 12) {
    return [currentYear, currentMonth + 1];
  }
  return [currentYear + 1, 1];
};
const nextYearMonthDay = (gallery, currentYear, currentMonth, currentDay) => {
  if (!("photos" in gallery)) {
    return undefined;
  }
  let year = currentYear;
  let month = currentMonth;
  let day = currentDay;
  while (!isLastYearMonthDay(gallery, year, month, day)) {
    day++;
    if (day > getDaysInMonth(year, month)) {
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
      day = 1;
    }
    if (
      year in gallery.photos &&
      month in gallery.photos[year] &&
      day in gallery.photos[year][month]
    ) {
      return [year, month, day];
    }
  }
  if (currentDay < getDaysInMonth(currentYear, currentMonth)) {
    return [currentYear, currentMonth, currentDay + 1];
  }
  if (currentMonth < 12) {
    return [currentYear, currentMonth + 1, 1];
  }
  return [currentYear + 1, 1, 1];
};

export default {
  formatDate,

  getMonths,
  getMonthDays,
  getDaysOfWeek,
  getMonthGrid,

  firstYear,
  firstYearMonth,
  firstYearMonthDay,
  lastYear,
  lastYearMonth,
  lastYearMonthDay,

  isFirstYear,
  isFirstYearMonth,
  isFirstYearMonthDay,
  isLastYear,
  isLastYearMonth,
  isLastYearMonthDay,

  previousYear,
  previousYearMonth,
  previousYearMonthDay,
  nextYear,
  nextYearMonth,
  nextYearMonthDay,
};
