import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import FormatDate from "./FormatDate";

import collection from "../utils/collection";

const GalleriesBody = ({ galleries }) => {
  const renderDescription = (gallery) => {
    return <div>{gallery.description()}</div>;
  };
  const renderEpoch = (gallery) => {
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
  const renderGallery = (gallery) => {
    const styles = collection.joinTruthyKeys({
      gallery: true,
      [`${gallery.theme()}-theme`]: gallery.hasTheme(),
    });
    return (
      <Link key={gallery.id()} to={gallery.path()}>
        <div key={gallery.id()} className={styles}>
          <h3>{gallery.title()}</h3>
          {renderDescription(gallery)}
          {renderEpoch(gallery)}
        </div>
      </Link>
    );
  };
  return (
    <div className="galleries">
      {galleries.map((gallery) => renderGallery(gallery))}
    </div>
  );
};
GalleriesBody.propTypes = {
  galleries: PropTypes.array.isRequired,
};
export default GalleriesBody;
