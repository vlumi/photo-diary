import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const Galleries = ({ galleries }) => {
  return (
    <>
      {/* TODO: design */}
      <h2>Pick gallery</h2>
      <ul>
        {galleries.map((gallery) => (
          <li key={gallery.id}>
            <Link to={`/g/${gallery.id}`}>{gallery.title}</Link>
          </li>
        ))}
      </ul>
    </>
  );
};
Galleries.propTypes = {
  galleries: PropTypes.array.isRequired,
};
export default Galleries;
