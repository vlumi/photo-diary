import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import EpochAge from "../EpochAge";
import EpochDayIndex from "../EpochDayIndex";

import Thumbnails from "../Thumbnails";
import Link from "../Link";

import calendar from "../../../lib/calendar";

import type { Gallery } from "../../../models/GalleryModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
`;
// `box-shadow` rather than border so the highlight doesn't shift layout
// (border-width changes would re-flow neighbouring DayTitles).
const DayTitle = styled.h3<{ $highlighted?: boolean }>`
  color: var(--header-color);
  background: var(--header-background);
  font-size: 18pt;
  text-align: center;
  margin: 1px;
  padding: 5px 3px;
  border-style: solid;
  border-width: 1px;
  border-color: var(--header-background);
  border-radius: 15px 0 0 15px;
  height: 200px;
  min-width: 25px;
  ${({ $highlighted }) =>
    $highlighted ? "box-shadow: 0 0 0 3px var(--primary-color);" : ""}
`;
const DaySubTitle = styled.span`
  display: block;
  font-size: 8pt;
  margin: 5px 0;
  color: var(--header-sub-color);
  background: inherit;
`;

interface Props {
  children?: React.ReactNode;
  gallery: Gallery;
  year: number;
  month: number;
  day?: number;
  lang: string;
  countryData: CountryData;
}

const Content = ({
  children,
  gallery,
  year,
  month,
  day,
  lang,
  countryData,
}: Props): React.ReactElement => {
  const { t } = useTranslation();

  // Scroll the highlighted day into view when arriving on `/g/.../<day>`.
  // `getElementById` rather than a ref so the lookup survives re-renders
  // and only fires when the `day` URL segment changes.
  React.useEffect(() => {
    if (!day) return;
    const el = document.getElementById(`month-day-${day}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [day, year, month]);

  if (!gallery.includesMonth(year, month)) {
    return (
      <>
        {children}
        <i>Empty</i>
      </>
    );
  }

  const renderEpochInfo = (day: number) => {
    if (!gallery.hasEpoch()) {
      return <></>;
    }
    switch (gallery.epochType()) {
      case "birthday":
        return (
          <DaySubTitle>
            <EpochAge gallery={gallery} year={year} month={month} day={day} />
          </DaySubTitle>
        );
      case "1-index":
        return (
          <DaySubTitle>
            <EpochDayIndex
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              lang={lang}
            />
          </DaySubTitle>
        );
      case "0-index":
        return (
          <DaySubTitle>
            <EpochDayIndex
              gallery={gallery}
              year={year}
              month={month}
              day={day}
              lang={lang}
              start={0}
            />
          </DaySubTitle>
        );
      default:
        return "";
    }
  };

  const renderDay = (d: number) => {
    const isHighlighted = d === day;
    return (
      <Thumbnails
        key={"" + year + month + d}
        gallery={gallery}
        photos={gallery.photos(year, month, d)}
        lang={lang}
        countryData={countryData}
      >
        <Link gallery={gallery} year={year} month={month} day={d}>
          <DayTitle id={`month-day-${d}`} $highlighted={isHighlighted}>
            {d}
            <DaySubTitle>
              {t(`weekday-short-${calendar.dayOfWeek(year, month, d)}`)}
            </DaySubTitle>
            {renderEpochInfo(d)}
          </DayTitle>
        </Link>
      </Thumbnails>
    );
  };

  return (
    <>
      {children}
      <Root>{gallery.mapDays(year, month, renderDay)}</Root>
    </>
  );
};
export default Content;
