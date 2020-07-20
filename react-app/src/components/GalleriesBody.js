import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import FormatDate from "./FormatDate";

const GalleriesBody = ({ gallery }) => {
  const renderDescription = (gallery) => {
    return <div>{gallery.description()}</div>;
  };
  const renderEpoch = () => {
    if (!gallery.hasEpoch()) {
      return <></>;
    }
    const [epochYear, epochMonth, epochDay] = gallery.epochYmd();
    return (
      <div>
        Epoch: <FormatDate year={epochYear} month={epochMonth} day={epochDay} />
      </div>
    );
  };

  return (
    <>
      <Link to={gallery.path()}>
        <div key={gallery.id()} className="gallery">
          <h3>{gallery.title()}</h3>
          {renderDescription(gallery)}
          {renderEpoch()}
        </div>
      </Link>
    </>
  );
};
GalleriesBody.propTypes = {
  gallery: PropTypes.object.isRequired,
};
export default GalleriesBody;
