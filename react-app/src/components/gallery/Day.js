import React from "react";
import PropTypes from "prop-types";
import { Redirect } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Swipeable } from "react-swipeable";

import DayNav from "./DayNav";
import DayContent from "./DayContent";
import DayFooter from "./DayFooter";

import useKeyPress from "../../utils/keypress";

const Day = ({ gallery, year, month, day, lang, countryData }) => {
  const [redirect, setRedirect] = React.useState(undefined);

  const handlMoveToFirst = () => {
    if (!gallery.isFirstDay(year, month, day)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.firstDay()));
    }
  };
  const handlMoveToPrevious = () => {
    if (!gallery.isFirstDay(year, month, day)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.previousDay(year, month, day)));
    }
  };
  const handlMoveToNext = () => {
    if (!gallery.isLastDay(year, month, day)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.nextDay(year, month, day)));
    }
  };
  const handlMoveToLast = () => {
    if (!gallery.isLastDay(year, month, day)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.lastDay()));
    }
  };

  useKeyPress("Escape", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.path(year, month));
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

  return (
    <>
      <Helmet>
        <title>{gallery.title(year, month, day)}</title>
      </Helmet>
      <DayNav gallery={gallery} year={year} month={month} day={day} />
      <Swipeable onSwiped={handleSwipe}>
        <div id="content">
          <DayContent
            gallery={gallery}
            year={year}
            month={month}
            day={day}
            lang={lang}
            countryData={countryData}
          />
        </div>
      </Swipeable>
      <DayFooter gallery={gallery} year={year} month={month} day={day} />
    </>
  );
};
Day.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Day;
