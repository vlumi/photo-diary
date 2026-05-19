import React from "react";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import type { SwipeEventData } from "react-swipeable";

import Swipeable from "../../Swipeable";

import Navigation from "./Navigation";
import Content from "./Content";
import Footer from "./Footer";

import useKeyPress from "../../../lib/keypress";

import type { Gallery } from "../../../models/GalleryModel";

type ActiveTheme = { get: (name: string) => string };

interface Props {
  children?: React.ReactNode;
  gallery: Gallery;
  year: number;
  theme: ActiveTheme;
}

const Year = ({
  children,
  gallery,
  year,
  theme,
}: Props): React.ReactElement => {
  const [redirect, setRedirect] = React.useState<string | undefined>(undefined);

  const { t } = useTranslation();

  const handlMoveToFirst = () => {
    const firstYear = gallery.firstYear();
    if (!gallery.isFirstYear(year) && firstYear) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(firstYear));
    }
  };
  const handlMoveToPrevious = () => {
    const previousYear = gallery.previousYear(year);
    if (!gallery.isFirstYear(year) && previousYear) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(previousYear));
    }
  };
  const handlMoveToNext = () => {
    const nextYear = gallery.nextYear(year);
    if (!gallery.isLastYear(year) && nextYear) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(nextYear));
    }
  };
  const handlMoveToLast = () => {
    const lastYear = gallery.lastYear();
    if (!gallery.isLastYear(year) && lastYear) {
      window.history.pushState({}, "");
      setRedirect(gallery.path(lastYear));
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
};
export default Year;
