import React from "react";
import { useTranslation } from "react-i18next";

import calendar from "../../lib/calendar";

import type { Gallery } from "../../models/GalleryModel";

interface Props {
  gallery: Gallery;
  year: number;
  month: number;
  day: number;
  lang: string;
  format?: string;
  start?: number;
}

const EpochDayIndex = ({
  gallery,
  year,
  month,
  day,
  lang,
  format = "short",
  start = 1,
}: Props): React.ReactElement | string => {
  const { t } = useTranslation();

  const epochYmd = gallery.epochYmd();
  if (!gallery.hasEpoch() || !epochYmd) {
    return "";
  }
  const days = calendar.daysSinceEpoch(epochYmd, [year, month, day]);
  const index = new Intl.NumberFormat(lang).format(days + start);
  switch (format) {
    default:
    case "short":
      return <>{t("epoch-day-short", { count: index } as never)}</>;
    case "long":
      return <>{t("epoch-day-long", { count: index } as never)}</>;
  }
};
export default EpochDayIndex;
