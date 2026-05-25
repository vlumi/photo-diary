import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { SwipeEventData } from "react-swipeable";

import Swipeable from "../../Swipeable";

import Navigation from "./Navigation";
import Content from "./Content";

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
  const navigate = useNavigate();

  const { t } = useTranslation();

  const handlMoveToFirst = () => {
    const firstYear = gallery.firstYear();
    if (!gallery.isFirstYear(year) && firstYear) {
      navigate(gallery.path(firstYear));
    }
  };
  const handlMoveToPrevious = () => {
    const previousYear = gallery.previousYear(year);
    if (!gallery.isFirstYear(year) && previousYear) {
      navigate(gallery.path(previousYear));
    }
  };
  const handlMoveToNext = () => {
    const nextYear = gallery.nextYear(year);
    if (!gallery.isLastYear(year) && nextYear) {
      navigate(gallery.path(nextYear));
    }
  };
  const handlMoveToLast = () => {
    const lastYear = gallery.lastYear();
    if (!gallery.isLastYear(year) && lastYear) {
      navigate(gallery.path(lastYear));
    }
  };

  useKeyPress("Escape", () => {
    navigate("/g");
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

  return (
    <>
      <title>
        {gallery.title(year)} — {t("nav-gallery")}
      </title>
      <Navigation gallery={gallery} year={year} />
      <Swipeable onSwiped={handleSwipe}>
        <Content gallery={gallery} year={year} theme={theme}>
          {children}
        </Content>
      </Swipeable>
    </>
  );
};
export default Year;
