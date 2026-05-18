import config from "./config/index.js";

const timeStamp = (): string => {
  const toIsoString = (date: Date): string => {
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

/* istanbul ignore next */
export const debug = (...params: unknown[]): void => {
  if (config.DEBUG) console.log(`[${timeStamp()}] DEBUG:`, ...params);
};
export const info = (...params: unknown[]): void =>
  console.log(`[${timeStamp()}] INFO:`, ...params);
export const error = (...params: unknown[]): void =>
  console.error(`[${timeStamp()}] ERROR:`, ...params);

export default { debug, info, error };
