import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Swipeable } from "../../Swipeable";
import { useTranslation } from "react-i18next";

import Title from "../Title";
import Navigation from "./Navigation";
import Content from "./Content";
import Footer from "./Footer";

import useKeyPress from "../../../lib/keypress";

const Year = ({ children, gallery, year, theme }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  const { t } = useTranslation();

  const handlMoveToFirst = () => {
    if (!gallery.isFirstYear(year)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(gallery.firstYear()));
    }
  };
  const handlMoveToPrevious = () => {
    if (!gallery.isFirstYear(year)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(gallery.previousYear(year)));
    }
  };
  const handlMoveToNext = () => {
    if (!gallery.isLastYear(year)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(gallery.nextYear(year)));
    }
  };
  const handlMoveToLast = () => {
    if (!gallery.isLastYear(year)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(gallery.lastYear()));
    }
  };

  useKeyPress("Escape", () => {
    window.history.pushState({}, "");
    setRedirect("/g");
  });
  useKeyPress("Home", handlMoveToFirst);
  useKeyPress("ArrowLeft", handlMoveToPrevious);
  useKeyPress("ArrowRight", handlMoveToNext);
  useKeyPress("End", handlMoveToLast);
  const handleSwipe = (event) => {
    switch (event.dir) {
      case "Left":
        handlMoveToNext();
        break;
      case "Right":
        handlMoveToPrevious();
        break;
      default:
        break;
    }
  };

  React.useEffect(() => {
    if (redirect) {
      const handle = setTimeout(() => setRedirect(""), 0);
      return () => {
        setRedirect("");
        clearTimeout(handle);
      };
    }
  }, [redirect]);
  if (redirect) {
    return <Redirect to={redirect} />;
  }

  if (year < 0) {
    // TODO: remove?
    return (
      <>
        <Title gallery={gallery} />
        {gallery.mapYears((year) => (
          // TODO: display year number somehow
          <div key={year} className="year">
            <Content gallery={gallery} year={Number(year)} theme={theme} />
          </div>
        ))}
      </>
    );
  } else {
    return (
      <>
        <Helmet>
          <title>
            {gallery.title(year)} — {t("nav-gallery")}
          </title>
        </Helmet>
        <Navigation gallery={gallery} year={year} />
        <Swipeable onSwiped={handleSwipe}>
          <Content gallery={gallery} year={year} theme={theme}>
            {children}
          </Content>
        </Swipeable>
        <Footer gallery={gallery} year={year} />
      </>
    );
  }
};
Year.propTypes = {
  children: PropTypes.any,
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  theme: PropTypes.object.isRequired,
};
export default Year;
