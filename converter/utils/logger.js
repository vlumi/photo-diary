const config = require("./config");

const timeStamp = () => {
  const toIsoString = (date) => {
    const y = String(date.getFullYear()).padStart(4, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    const ms = String(date.getMilliseconds()).padEnd(3, "0");
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}.${ms}`;
  };
  return toIsoString(new Date());
};

const debug = (...params) => {
  if (config.DEBUG) console.log(`[${timeStamp()}] DEBUG:`, ...params);
};
const info = (...params) => console.log(`[${timeStamp()}] INFO:`, ...params);
const error = (...params) =>
  console.error(`[${timeStamp()}] ERROR:`, ...params);

module.exports = {
  debug,
  info,
  error,
};
