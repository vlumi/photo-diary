import React from "react";
import PropTypes from "prop-types";

import Title from "./Title";
import Thumbnails from "./Thumbnails";

const DayContent = ({
  gallery,
  year,
  month,
  day,
  lang,
  countryData,
}) => {
  if (!gallery.includesDay(year, month, day)) {
    return <i>Empty</i>;
  }

  const renderContent = () => {
    return (
      <Thumbnails
        gallery={gallery}
        photos={gallery.photos(year, month, day)}
        lang={lang}
        countryData={countryData}
      />
    );
  };

  // TODO: epoch & epochMode
  return (
    <>
      <Title gallery={gallery} />
      <div className="day">{renderContent()}</div>
    </>
  );
};
DayContent.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default DayContent;
