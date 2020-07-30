import React from "react";
import PropTypes from "prop-types";
import { Link as ReactLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Link from "./Link";

const Title = ({ gallery, context }) => {
  const { t } = useTranslation();

  const renderContextSwitch = () => {
    switch (context) {
      case "gallery-stats":
        return (
          <span className="stats">
            <Link gallery={gallery}>{t("nav-gallery")}</Link>
          </span>
        );
      case "gallery":
      default:
        return (
          <span className="stats">
            <ReactLink to={gallery.statsPath()}>
              {t("nav-gallery-stats")}
            </ReactLink>
          </span>
        );
    }
  };

  return (
    <>
      <span className="gallery-menu">
        <span className="top">
          <Link>{t("nav-gallery-top")}</Link>
        </span>
        {renderContextSwitch()}
      </span>
      <h1>
        {gallery.title()}
        {context ? <> — {t(`nav-${context}`)}</> : ""}
      </h1>
    </>
  );
};
Title.propTypes = {
  galleries: PropTypes.array.isRequired,
  gallery: PropTypes.object.isRequired,
  context: PropTypes.string,
};
export default Title;
