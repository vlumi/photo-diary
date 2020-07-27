import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import GLink from "./Link";

const Title = ({ gallery }) => {
  const { t } = useTranslation();

  return (
    <>
      <span className="gallery-menu">
        <span className="top">
          <GLink>{t("nav-gallery-top")}</GLink>
        </span>
        <span className="stats">
          <Link to={gallery.statsPath()}>{t("nav-gallery-stats")}</Link>
        </span>
      </span>
      <h1>{gallery.title()}</h1>
    </>
  );
};
Title.propTypes = {
  gallery: PropTypes.object.isRequired,
};
export default Title;
