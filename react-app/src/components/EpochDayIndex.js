import { useTranslation } from "react-i18next";

import calendar from "../utils/calendar";

const EpochDayIndex = ({ gallery, year, month, day }) => {
  const { i18n } = useTranslation();

  if (!gallery.hasEpoch()) {
    return "";
  }
  const days = calendar.daysSinceEpoch(gallery.epochYmd(), [year, month, day]);
  const index = new Intl.NumberFormat(i18n.language).format(days + 1);
  return `#${index}`;
};

export default EpochDayIndex;
