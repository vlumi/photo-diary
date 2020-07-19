import calendar from "../utils/calendar";

const DayIndex = ({ gallery, year, month, day }) => {
  if (!gallery.hasEpoch()) {
    return "";
  }
  return calendar.daysSinceEpoch(gallery.epochYmd(), [year, month, day]) + 1;
};

export default DayIndex;
