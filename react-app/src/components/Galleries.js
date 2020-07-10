import React from "react";
import PropTypes from "prop-types";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";

import Gallery from "./Gallery";

const Galleries = ({ galleries }) => {
  return (
    <>
      <h2>Pick gallery</h2>
      <ul>
        {galleries.map((gallery) => (
          <li>
            <Link to={`/gallery/${gallery.id}`}>{gallery.title}</Link>
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
