import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import calendar from "../../lib/calendar";

const EpochDayIndex = ({
  gallery,
  year,
  month,
  day,
  lang,
  format = "short",
  start = 1,
}) => {
  const { t } = useTranslation();

  if (!gallery.hasEpoch()) {
    return "";
  }
  const days = calendar.daysSinceEpoch(gallery.epochYmd(), [year, month, day]);
  const index = new Intl.NumberFormat(lang).format(days + start);
  switch (format) {
    default:
    case "short":
      return <>{t("epoch-day-short", { count: index })}</>;
    case "long":
      return <>{t("epoch-day-long", { count: index })}</>;
  }
};
EpochDayIndex.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  lang: PropTypes.string.isRequired,
  format: PropTypes.string,
  start: PropTypes.number,
};
export default EpochDayIndex;
