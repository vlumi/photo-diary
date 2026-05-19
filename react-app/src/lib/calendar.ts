import config from "./config";

type Ymd = [number, number, number];

const daysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

const months = (
  year: number,
  firstYear?: number,
  firstMonth?: number,
  lastYear?: number,
  lastMonth?: number
): number[] => {
  return Array.from(Array(13).keys())
    .slice(1)
    .filter(
      (month) =>
        !year ||
        !firstYear ||
        !firstMonth ||
        !lastYear ||
        !lastMonth ||
        ((year > firstYear || (year === firstYear && month >= firstMonth)) &&
          (year < lastYear || (year === lastYear && month <= lastMonth)))
    );
};

const monthDays = (year: number, month: number): number[] =>
  Array.from(Array(daysInMonth(year, month) + 1).keys()).slice(1);

const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const daysOfWeek = (firstWeekday: number = config.FIRST_WEEKDAY): string[] =>
  Array(7)
    .fill(0)
    .map((_x, index) => DOW[(index + firstWeekday) % 7]);

const dayOfWeek = (year: number, month: number, day: number): string => {
  return DOW[new Date(year, month - 1, day).getDay()];
};

const monthGrid = (
  year: number,
  month: number,
  firstWeekday: number = config.FIRST_WEEKDAY
): number[][] => {
  const days = monthDays(year, month);
  const firstDow = new Date(year, month - 1, 1).getDay();

  const result: number[][] = [];
  let row = 0;
  let col = (firstDow + 7 - firstWeekday) % 7;
  days.forEach((day) => {
    result[row] = result[row] || Array<number>(7).fill(0);
    result[row][col] = day;
    col = col + 1;
    if (col === 7) {
      col = 0;
      row++;
    }
  });
  return result;
};

const previousYear = (year: number): number => year - 1;
const previousMonth = (year: number, month: number): [number, number] => {
  if (month > 1) {
    return [year, month - 1];
  }
  return [year - 1, 12];
};
const previousDay = (year: number, month: number, day: number): Ymd => {
  if (day > 1) {
    return [year, month, day - 1];
  }
  if (month > 1) {
    return [year, month - 1, daysInMonth(year, month - 1)];
  }
  return [year - 1, 12, daysInMonth(year, 12)];
};

const nextYear = (year: number): number => year + 1;
const nextMonth = (year: number, month: number): [number, number] => {
  if (month < 12) {
    return [year, month + 1];
  }
  return [year + 1, 1];
};
const nextDay = (year: number, month: number, day: number): Ymd => {
  if (day < daysInMonth(year, month)) {
    return [year, month, day + 1];
  }
  if (month < 12) {
    return [year, month + 1, 1];
  }
  return [year + 1, 1, 1];
};

const sinceEpochYmd = (epoch: Ymd, now: Ymd): Ymd => {
  const [y1, m1, d1] = epoch;
  const [y2, m2, d2] = now;

  if (
    y1 > y2 ||
    (y1 === y2 && m1 > m2) ||
    (y1 === y2 && m1 === m2 && d1 > d2)
  ) {
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

const daysSinceEpoch = (epoch: Ymd, now: Ymd): number => {
  const [y1, m1, d1] = epoch;
  const [y2, m2, d2] = now;
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);

  const diff = date2.getTime() - date1.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
};

export default {
  daysInMonth,
  months,
  monthDays,
  daysOfWeek,
  dayOfWeek,
  monthGrid,

  previousYear,
  previousMonth,
  previousDay,
  nextYear,
  nextMonth,
  nextDay,

  sinceEpochYmd,
  daysSinceEpoch,
};
