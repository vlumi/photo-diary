import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import G from "../utils/gallery";

const Galleries = ({ galleries }) => {
  return (
    <>
      {/* TODO: design */}
      <h2><span className="title">Pick gallery</span></h2>
      <div className="content">
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
      </div>
    </>
  );
};
Galleries.propTypes = {
  galleries: PropTypes.array.isRequired,
};
export default Galleries;
