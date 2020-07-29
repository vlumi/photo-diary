import React from "react";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const StatsTitle = ({ gallery }) => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>
          {gallery.title()} — {t("nav-gallery-stats")}
        </title>
      </Helmet>
      <span className="gallery-menu">
        <span className="top">
          <Link to="/g">{t("nav-gallery-top")}</Link>
        </span>
        <span className="stats">
          <Link to={gallery.lastPath()}>{t("nav-gallery")}</Link>
        </span>
      </span>
      <h1>{gallery.title()}</h1>
    </>
  );
};
StatsTitle.propTypes = {
  gallery: PropTypes.object.isRequired,
};
export default StatsTitle;
