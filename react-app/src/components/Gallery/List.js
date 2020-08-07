import React from "react";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";

import ListBody from "./ListBody";

const List = ({ children, galleries }) => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t("nav-galleries")}</title>
      </Helmet>
      {children}
      <div id="content">
        <ListBody galleries={galleries} />
      </div>
    </>
  );
};
List.propTypes = {
  children: PropTypes.any,
  galleries: PropTypes.array,
};
export default List;
