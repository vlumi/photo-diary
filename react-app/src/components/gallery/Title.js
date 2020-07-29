import React from "react";
import PropTypes from "prop-types";
import { Link as ReactLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Link from "./Link";

const Title = ({ gallery }) => {
  const { t } = useTranslation();

  return (
    <>
      <span className="gallery-menu">
        <span className="top">
          <Link>{t("nav-gallery-top")}</Link>
        </span>
        <span className="stats">
          <ReactLink to={gallery.statsPath()}>{t("nav-gallery-stats")}</ReactLink>
        </span>
      </span>
      <h1>
        {gallery.title()} — {t("nav-gallery")}
      </h1>
    </>
  );
};
Title.propTypes = {
  gallery: PropTypes.object.isRequired,
};
export default Title;
