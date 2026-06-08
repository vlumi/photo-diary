import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { SwipeEventData } from "react-swipeable";

import Swipeable from "../../Swipeable";

import Navigation from "./Navigation";
import Content from "./Content";

import useKeyPress from "../../../lib/keypress";
import useFilteredCalendar from "../../../lib/useFilteredCalendar";

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
  const cal = useFilteredCalendar(gallery.id());

  const handlMoveToFirst = () => {
    const firstYear = cal.firstYear();
    if (!cal.isFirstYear(year) && firstYear !== undefined) {
      navigate(gallery.path(firstYear));
    }
  };
  const handlMoveToPrevious = () => {
    const previousYear = cal.previousYear(year);
    if (previousYear !== undefined) {
      navigate(gallery.path(previousYear));
    }
  };
  const handlMoveToNext = () => {
    const nextYear = cal.nextYear(year);
    if (nextYear !== undefined) {
      navigate(gallery.path(nextYear));
    }
  };
  const handlMoveToLast = () => {
    const lastYear = cal.lastYear();
    if (!cal.isLastYear(year) && lastYear !== undefined) {
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
