import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import EpochAge from "../EpochAge";
import EpochDayIndex from "../EpochDayIndex";

import Thumbnails from "../Thumbnails";
import Link from "../Link";

import calendar from "../../../lib/calendar";
import filter from "../../../lib/filter";
import galleryPhotosService from "../../../services/gallery-photos";
import PhotoModel, {
  type Photo as PhotoT,
} from "../../../models/PhotoModel";
import { useFiltersStore } from "../../../stores";

import type { Gallery } from "../../../models/GalleryModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
`;
// Day chip: a flat rectangular badge that rides along inline with the
// day's first photo (same wrap-flex as everything else, no per-day row
// break). 212 px tall to match the Thumbnail Root height so the chip
// and the photo's matte line up at both edges. The chip's dark
// `--header-background` body against the photo matte is the
// day-boundary signal — no light accent stripe (that read as an
// unintended border against the chip's dark bg).
//
// `margin: 1px` matches the per-photo Thumbnail margin so the visible
// gaps around the chip are the same width as gaps between photos; the
// highlighted-day tint band reads continuously across the row.
const DayTitle = styled.h3`
  width: 56px;
  height: 212px;
  margin: 1px;
  box-sizing: border-box;
  background: var(--header-background);
  color: var(--header-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 4px;
  font-weight: 700;
  font-size: 26pt;
  line-height: 1;
  letter-spacing: -0.02em;
  border: none;
  scroll-margin-top: 50px;
`;
const DaySubTitle = styled.span`
  display: block;
  font-size: 10pt;
  font-weight: 500;
  line-height: 1;
  color: var(--header-sub-color);
  background: inherit;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

interface Props {
  children?: React.ReactNode;
  gallery: Gallery;
  year: number;
  month: number;
  day?: number;
  lang: string;
  countryData: CountryData;
  modalActive?: boolean;
}

const Content = ({
  children,
  gallery,
  year,
  month,
  day,
  lang,
  countryData,
  modalActive,
}: Props): React.ReactElement => {
  const { t } = useTranslation();

  // Per-view fetch (#406): server returns the month's photos
  // already filter-narrowed, so we group them by day client-side
  // and skip the in-memory gallery.photos walk.
  const filters = useFiltersStore((s) => s.filters);
  const serverFilters = React.useMemo(
    () => filter.toServerFilters(filters),
    [filters]
  );
  const { data: photosRaw } = useQuery({
    queryKey: [
      "gallery-photos-month",
      gallery.id(),
      year,
      month,
      serverFilters,
      lang,
    ],
    queryFn: () =>
      galleryPhotosService.query(gallery.id(), {
        filter: serverFilters,
        year,
        month,
        lang,
      }),
    placeholderData: keepPreviousData,
  });
  const photosByDay = React.useMemo(() => {
    const out: Record<number, PhotoT[]> = {};
    for (const raw of (photosRaw ?? []) as Array<Record<string, unknown>>) {
      const photo = PhotoModel(raw);
      if (!photo) continue;
      const d = photo.day();
      if (!out[d]) out[d] = [];
      out[d].push(photo);
    }
    return out;
  }, [photosRaw]);
  const daysWithPhotos = React.useMemo(
    () =>
      Object.keys(photosByDay)
        .map(Number)
        .sort((a, b) => a - b),
    [photosByDay]
  );

  // RAF defers past ScrollToPosition's setTimeout(0) — without that delay
  // the parent's scroll restore fires last and undoes this jump. While
  // the Photo modal is mounted on top, fire only once (the initial mount
  // — so closing a direct-link photo URL lands on the right day) and
  // skip subsequent day-prop changes triggered by in-modal photo
  // navigation, which otherwise visibly scroll Month under the modal.
  const hasScrolledRef = React.useRef(false);
  React.useEffect(() => {
    if (!day) return;
    if (modalActive && hasScrolledRef.current) return;
    hasScrolledRef.current = true;
    const handle = requestAnimationFrame(() => {
      const el = document.getElementById(`month-day-${day}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(handle);
  }, [day, year, month, modalActive]);

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

  // `skipScrollRestore` opts the toggle out of ScrollToPosition — we
  // handle the scroll ourselves above and don't want a flash to top
  // between click and our scrollIntoView.
  const renderDay = (d: number) => {
    const isHighlighted = d === day;
    const linkDay = isHighlighted ? undefined : d;
    return (
      <Thumbnails
        key={"" + year + month + d}
        gallery={gallery}
        photos={photosByDay[d] ?? []}
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
      <Root>{daysWithPhotos.map(renderDay)}</Root>
    </>
  );
};
export default Content;
