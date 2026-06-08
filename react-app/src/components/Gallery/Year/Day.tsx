import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import DayCell from "./DayCell";

import color from "../../../lib/color";
import format from "../../../lib/format";

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
  year: number;
  month: number;
  day: number;
  counts: Record<string, number>;
  maxCount: number;
  theme: ActiveTheme;
}

const Day = ({
  year,
  month,
  day,
  counts,
  maxCount,
  theme,
}: Props): React.ReactElement => {
  const heatColors = getHeatColors(theme);

  const { t } = useTranslation();

  const renderDayValue = (day: number): React.ReactNode => {
    if (day === 0) {
      return <></>;
    }
    return day;
  };

  const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const photoCount = counts[key] ?? 0;
  const heatColor =
    maxCount === 0
      ? heatColors[0]
      : heatColors[Math.round((photoCount * 10) / maxCount)];
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
