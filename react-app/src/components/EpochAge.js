import React from "react";

import { useTranslation } from "react-i18next";

import calendar from "../utils/calendar";

const EpochAge = ({ gallery, year, month, day }) => {
  const { t } = useTranslation();
  if (!gallery.hasEpoch()) {
    return "";
  }
  const epochDiffYmd = calendar.sinceEpochYmd(gallery.epochYmd(), [
    year,
    month,
    day,
  ]);

  const partTitles = [t("years-short"), t("months-short"), t("days-short")];
  const parts = [];
  for (const i in [...Array(epochDiffYmd.length).keys()]) {
    if (epochDiffYmd[i] > 0) {
      parts.push(`${epochDiffYmd[i]}${partTitles[i]}`);
    }
  }
  if (parts.length === 0) {
    return `0${t("days-short")}`;
  }

  return parts.map((part) => (
    <>
      {part}
      <br />
    </>
  ));
};

export default EpochAge;
