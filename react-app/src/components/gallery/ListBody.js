import React from "react";
import PropTypes from "prop-types";

import Link from "./Link";

import config from "../../lib/config";
import collection from "../../lib/collection";

const ListBody = ({ galleries }) => {
  const renderDescription = (gallery) => {
    return <div className="description">{gallery.description()}</div>;
  };
  const renderIcon = (gallery) => {
    if (!gallery.hasIcon()) {
      return "";
    }
    const url = `${config.PHOTO_ROOT_URL}${gallery.icon()}`;
    return (
      <div className="icon">
        <img src={url} alt={gallery.title()} />
      </div>
    );
  };
  const renderGallery = (gallery) => {
    const className = collection.joinTruthyKeys({
      gallery: true,
      [`${gallery.theme()}-theme`]: gallery.hasTheme(),
    });
    return (
      <Link gallery={gallery}>
        <div key={gallery.id()} className={className}>
          <h3>{gallery.title()}</h3>
          {renderIcon(gallery)}
          {renderDescription(gallery)}
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
ListBody.propTypes = {
  galleries: PropTypes.array.isRequired,
};
export default ListBody;
