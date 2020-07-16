import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const Galleries = ({ galleries }) => {
  return (
    <>
      <h2>Pick gallery</h2>
      <ul>
        {galleries.map((gallery) => (
          <li key={gallery.id}>
            <Link to={`/g/${gallery.id}`}>{gallery.title}</Link>
          </li>
        ))}
      </ul>
      <div>TODO: implement</div>
    </>
  );
};

Galleries.propTypes = {
  galleries: PropTypes.array,
};
export default Galleries;
