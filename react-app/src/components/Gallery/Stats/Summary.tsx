import React from "react";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import {
  BsImages,
  BsBarChartFill,
  BsCalendar3,
  BsCalendar2,
  BsCalendarDay,
} from "react-icons/bs";
import type { IconType } from "react-icons";

import type { StatsCategory } from "../../../lib/stats";

const Root = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 6px;
  padding: 4px 0;
`;
const Kpi = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 12px 6px;
  background: var(--tile-background);
  border: 1px solid var(--inactive-color);
  border-radius: 6px;
`;
const IconWrap = styled.div`
  font-size: 1.4em;
  color: var(--primary-color);
  opacity: 0.7;
  margin-bottom: 6px;
  display: inline-flex;
`;
const Label = styled.div`
  font-size: 0.75em;
  color: var(--inactive-color);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
`;
const Value = styled.div`
  font-size: 1.5em;
  font-weight: bold;
  color: var(--primary-color);
  text-align: center;
  line-height: 1.1;
`;

// Per-KPI icon. Keys match the kpi.key values produced by
// `collectSummary` in `lib/stats.tsx`.
const ICONS: Record<string, IconType> = {
  photos: BsImages,
  average: BsBarChartFill,
  years: BsCalendar3,
  months: BsCalendar2,
  days: BsCalendarDay,
};

interface Props {
  category: StatsCategory;
}

const Summary = ({ category }: Props): React.ReactElement => {
  const { t } = useTranslation();

  if (!category.kpi) {
    return <></>;
  }
  return (
    <Root>
      {category.kpi.map((kpi) => {
        const Icon = ICONS[kpi.key];
        return (
          <Kpi key={`kpi:${kpi.key}`}>
            {Icon && (
              <IconWrap aria-hidden="true">
                <Icon />
              </IconWrap>
            )}
            <Label>{t(`stats-kpi-title-${kpi.key}`)}</Label>
            <Value>
              {String(
                t(`stats-kpi-${kpi.key}`, {
                  count: kpi.value,
                } as never)
              )}
            </Value>
          </Kpi>
        );
      })}
    </Root>
  );
};
export default Summary;
