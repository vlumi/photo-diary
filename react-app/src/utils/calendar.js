import config from "./config";

const getMonths = () => Array.from(Array(13).keys()).slice(1);

const getMonthDays = (year, month) =>
  Array.from(Array(new Date(year, month, 0).getDate() + 1).keys()).slice(1);

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
    // console.log("grid", year, month, week, dow, JSON.stringify(result));
    col = col + 1;
    if (col === 7) {
      col = 0;
      row++;
    }
  });
  return result;
};

export default {
  getMonths,
  getMonthDays,
  getDaysOfWeek,
  getMonthGrid,
};
