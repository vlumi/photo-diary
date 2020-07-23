import React from "react";

import { useTranslation } from "react-i18next";

import calendar from "../utils/calendar";

const EpochAge = ({
  gallery,
  year,
  month,
  day,
  format = "short",
  separator = <br />,
}) => {
  const { t } = useTranslation();
  if (!gallery.hasEpoch()) {
    return "";
  }
  const epochDiffYmd = calendar.sinceEpochYmd(gallery.epochYmd(), [
    year,
    month,
    day,
  ]);

  const partTitles = [`years-${format}`, `months-${format}`, `days-${format}`];
  const parts = [];
  for (const i in [...Array(epochDiffYmd.length).keys()]) {
    if (epochDiffYmd[i] > 0) {
      parts.push(`${t(partTitles[i], { count: epochDiffYmd[i] })}`);
    }
  }
  if (parts.length === 0) {
    return "0" + t(`days-${format}}`);
  }

  return parts.map((part, index) => (
    <span key={`age-${year}${month}${day}${index}`}>
      {part}
      {separator}
    </span>
  ));
};

export default EpochAge;
