import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import GalleryThumbnails from "./GalleryThumbnails";
import GalleryLink from "./GalleryLink";
import EpochAge from "./EpochAge";
import EpochDayIndex from "./EpochDayIndex";

import calendar from "../utils/calendar";

const GalleryMonthBody = ({ gallery, year, month }) => {
  const { t } = useTranslation();

  if (!gallery.includesMonth(year, month)) {
    return <i>Empty</i>;
  }
  return gallery.mapDays(year, month, (day) => {
    return (
      <GalleryThumbnails
        key={"" + year + month + day}
        gallery={gallery}
        photos={gallery.photos(year, month, day)}
      >
        <h3>
          <GalleryLink gallery={gallery} year={year} month={month} day={day}>
            {day}
          </GalleryLink>
          <span>
            {t(`weekday-short-${calendar.dayOfWeek(year, month, day)}`)}
          </span>
          {gallery.hasEpoch() ? (
            <>
              {/* TODO: choose from configuration -- make a component */}
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
      </GalleryThumbnails>
    );
  });
};
GalleryMonthBody.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default GalleryMonthBody;
