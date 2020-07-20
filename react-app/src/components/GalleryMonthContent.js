import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import GalleryTitle from "./GalleryTitle";
import GalleryThumbnails from "./GalleryThumbnails";
import GalleryLink from "./GalleryLink";
import EpochAge from "./EpochAge";
import EpochDayIndex from "./EpochDayIndex";

import calendar from "../utils/calendar";

const GalleryMonthContent = ({ gallery, year, month }) => {
  const { t } = useTranslation();

  if (!gallery.includesMonth(year, month)) {
    return <i>Empty</i>;
  }

  const renderDay = (day) => {
    return (
      <GalleryThumbnails
        key={"" + year + month + day}
        gallery={gallery}
        photos={gallery.photos(year, month, day)}
      >
        <GalleryLink gallery={gallery} year={year} month={month} day={day}>
          <h3>
            {day}
            <span>
              {t(`weekday-short-${calendar.dayOfWeek(year, month, day)}`)}
            </span>
            {gallery.hasEpoch() ? (
              <>
                <span>
                  <EpochAge
                    gallery={gallery}
                    year={year}
                    month={month}
                    day={day}
                  />
                </span>
                <span>
                  <EpochDayIndex
                    gallery={gallery}
                    year={year}
                    month={month}
                    day={day}
                  />
                </span>
              </>
            ) : (
              <></>
            )}
          </h3>
        </GalleryLink>
      </GalleryThumbnails>
    );
  };

  return (
    <>
      <GalleryTitle gallery={gallery} />
      <div className="month">{gallery.mapDays(year, month, renderDay)}</div>
    </>
  );
};
GalleryMonthContent.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default GalleryMonthContent;
