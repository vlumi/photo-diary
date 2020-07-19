import calendar from "../utils/calendar";

const FromEpoch = ({ gallery, year, month, day }) => {
  if (!gallery.hasEpoch()) {
    return "";
  }
  const epochDiffYmd = calendar.sinceEpochYmd(gallery.epochYmd(), [
    year,
    month,
    day,
  ]);

  const partTitles = ["y", "m", "d"];
  const parts = [];
  for (const i in [...Array(epochDiffYmd.length).keys()]) {
    if (epochDiffYmd[i] > 0) {
      parts.push(`${epochDiffYmd[i]}${partTitles[i]}`);
    }
  }
  if (parts.length === 0) {
    return "0d";
  }

  return parts.join(" ");
};

export default FromEpoch;
