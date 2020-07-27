import React from "react";
import PropTypes from "prop-types";

import Link from "./Link";

const Title = ({ gallery }) => (
  <>
    {/* TODO: design */}
    <span>
      <Link>galleries</Link>
    </span>
    <h1>{gallery.title()}</h1>
  </>
);
Title.propTypes = {
  gallery: PropTypes.object.isRequired,
};
export default Title;
