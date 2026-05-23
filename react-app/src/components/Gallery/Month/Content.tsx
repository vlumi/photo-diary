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
const DayTitle = styled.h3`
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
  // Wrapped in `requestAnimationFrame` to fire after the macrotask queue,
  // which means it lands *after* `ScrollToPosition`'s `setTimeout(0)` in
  // [App.tsx](../../App.tsx) (which would otherwise reset us to the
  // store's saved scroll position and silently undo this jump).
  React.useEffect(() => {
    if (!day) return;
    const handle = requestAnimationFrame(() => {
      const el = document.getElementById(`month-day-${day}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(handle);
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

  // Clicking a DayTitle toggles the day in the URL: highlighting a new
  // day adds it, clicking the already-highlighted day's title removes
  // it (drops back to `/g/.../<year>/<month>`). `skipScrollRestore`
  // keeps `<ScrollToPosition>` from snapping the page to 0 during the
  // toggle — we already know what we want to do with the scroll (jump
  // to the new day for an "add", stay put for a "remove").
  const renderDay = (d: number) => {
    const isHighlighted = d === day;
    const linkDay = isHighlighted ? undefined : d;
    return (
      <Thumbnails
        key={"" + year + month + d}
        gallery={gallery}
        photos={gallery.photos(year, month, d)}
        lang={lang}
        countryData={countryData}
        highlighted={isHighlighted}
      >
        <Link
          gallery={gallery}
          year={year}
          month={month}
          day={linkDay}
          state={{ skipScrollRestore: true }}
        >
          <DayTitle id={`month-day-${d}`}>
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
