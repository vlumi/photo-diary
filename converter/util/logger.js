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

module.exports = {
  info: (message) => console.log(`[${timeStamp()}] ${message}`),
  error: (message) => console.log(`[${timeStamp()}] ERROR: ${message}`),
};
