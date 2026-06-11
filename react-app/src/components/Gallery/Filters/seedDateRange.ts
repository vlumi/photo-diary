import { type DateRange } from "../../../stores/filters";

// Pre-fill the date-range pill based on the URL's year / month /
// day when the operator activates it. Browser native
// `<input type="date">` doesn't expose a "default month" attribute,
// so the only way to anchor the calendar to the currently-viewed
// slice is to seed the inputs themselves. The operator can clear
// or adjust from there.
const seedDateRangeFromUrl = (
  year?: string,
  month?: string,
  day?: string
): DateRange => {
  if (year && month && day) {
    const ymd = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return { from: ymd, to: ymd };
  }
  if (year && month) {
    const m = month.padStart(2, "0");
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    return {
      from: `${year}-${m}-01`,
      to: `${year}-${m}-${String(lastDay).padStart(2, "0")}`,
    };
  }
  if (year) {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  return {};
};
export default seedDateRangeFromUrl;
