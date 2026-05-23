import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import DayCell from "./DayCell";

import color from "../../../lib/color";
import format from "../../../lib/format";

import type { Gallery } from "../../../models/GalleryModel";

type ActiveTheme = { get: (name: string) => string };

const Some = styled(DayCell)``;
const None = styled(DayCell)`
  color: var(--inactive-color);
`;

interface HeatColorCache {
  from: string | undefined;
  to: string | undefined;
  values: string[];
}
const cachedHeatColors: HeatColorCache = {
  from: undefined,
  to: undefined,
  values: [],
};
const getHeatColors = (theme: ActiveTheme): string[] => {
  const gradientFrom = theme.get("primary-background");
  const gradientTo = theme.get("inactive-color");
  if (
    cachedHeatColors.from === gradientFrom &&
    cachedHeatColors.to === gradientTo
  ) {
    return cachedHeatColors.values;
  }
  cachedHeatColors.from = gradientFrom;
  cachedHeatColors.to = gradientTo;
  cachedHeatColors.values = color.colorGradient(gradientFrom, gradientTo, 11);
  return cachedHeatColors.values;
};

interface Props {
  gallery: Gallery;
  year: number;
  month: number;
  day: number;
  maxCount: number;
  theme: ActiveTheme;
}

const Day = ({
  gallery,
  year,
  month,
  day,
  maxCount,
  theme,
}: Props): React.ReactElement => {
  const heatColors = getHeatColors(theme);

  const { t } = useTranslation();

  // Day cells render the day number only; the whole month tile is the
  // link target (see `./Month.tsx`). Day URLs still work for shared links
  // and surface as a click on the DayTitle inside Month view, but they
  // aren't promoted as the primary navigation target from the heatmap.
  const renderDayValue = (day: number): React.ReactNode => {
    if (day === 0) {
      return <></>;
    }
    return day;
  };

  const photoCount = gallery.countPhotos(year, month, day);
  const heatColor = heatColors[Math.round((photoCount * 10) / maxCount)];
  const style = {
    backgroundColor: heatColor,
  };
  const title = `${format.date({
    year,
    month,
    day,
  })}: ${t("photo-count", {
    count: photoCount,
  })}`;
  if (photoCount === 0) {
    return <None title={title}>{renderDayValue(day)}</None>;
  }
  return (
    <Some style={style} title={title}>
      {renderDayValue(day)}
    </Some>
  );
};
export default Day;
