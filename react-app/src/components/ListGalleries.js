import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import G from "../utils/gallery";

const ListGalleries = ({ galleries }) => {
  return (
    <>
      {/* TODO: design */}
      <h2>Pick gallery</h2>
      <ul>
        {galleries
          .map((gallery) => G(gallery))
          .map((gallery) => {
            return (
              <li key={gallery.id()}>
                <Link to={gallery.path()}>{gallery.title()}</Link>
              </li>
            );
          })}
      </ul>
    </>
  );
};
ListGalleries.propTypes = {
  galleries: PropTypes.array.isRequired,
};
export default ListGalleries;
