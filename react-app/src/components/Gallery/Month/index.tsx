import React from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { SwipeEventData } from "react-swipeable";

import Swipeable from "../../Swipeable";

import Navigation from "./Navigation";
import Content from "./Content";
import Footer from "./Footer";

import useKeyPress from "../../../lib/keypress";

import type { Gallery } from "../../../models/GalleryModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

interface Props {
  children?: React.ReactNode;
  gallery: Gallery;
  year: number;
  month: number;
  day?: number;
  lang: string;
  countryData: CountryData;
}

// `day` is purely a scroll/highlight anchor — every interaction (prev/next,
// Escape) still operates at the month level. Landing on
// `/g/.../<year>/<month>/<day>` renders the whole Month with that day's
// thumbnails scrolled into view and the DayTitle visually marked.
const Month = ({
  children,
  gallery,
  year,
  month,
  day,
  lang,
  countryData,
}: Props): React.ReactElement => {
  const [redirect, setRedirect] = React.useState<string | undefined>(undefined);

  const { t } = useTranslation();

  const handlMoveToFirst = () => {
    if (!gallery.isFirstMonth(year, month)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.firstMonth()));
    }
  };
  const handlMoveToPrevious = () => {
    if (!gallery.isFirstMonth(year, month)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.previousMonth(year, month)));
    }
  };
  const handlMoveToNext = () => {
    if (!gallery.isLastMonth(year, month)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.nextMonth(year, month)));
    }
  };
  const handlMoveToLast = () => {
    if (!gallery.isLastMonth(year, month)) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(...gallery.lastMonth()));
    }
  };

  useKeyPress("Escape", () => {
    window.history.pushState({}, "");
    setRedirect(gallery.path(year));
  });
  useKeyPress("Home", handlMoveToFirst);
  useKeyPress("ArrowLeft", handlMoveToPrevious);
  useKeyPress("ArrowRight", handlMoveToNext);
  useKeyPress("End", handlMoveToLast);
  const handleSwipe = (event: SwipeEventData) => {
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
    return <Navigate to={redirect} replace />;
  }

  return (
    <>
      <title>
        {gallery.title(year, month, day)} — {t("nav-gallery")}
      </title>
      <Navigation gallery={gallery} year={year} month={month} />
      <Swipeable onSwiped={handleSwipe}>
        <Content
          gallery={gallery}
          year={year}
          month={month}
          day={day}
          lang={lang}
          countryData={countryData}
        >
          {children}
        </Content>
      </Swipeable>
      <Footer gallery={gallery} year={year} month={month} />
    </>
  );
};
export default Month;
