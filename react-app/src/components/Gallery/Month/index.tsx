import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { SwipeEventData } from "react-swipeable";

import Swipeable from "../../Swipeable";

import Navigation from "./Navigation";
import Content from "./Content";

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
  // True when the Photo modal is mounted on top — suppresses the
  // scroll-to-day on subsequent day changes so the Month doesn't
  // visibly scroll under the modal during in-modal navigation.
  modalActive?: boolean;
}

const Month = ({
  children,
  gallery,
  year,
  month,
  day,
  lang,
  countryData,
  modalActive,
}: Props): React.ReactElement => {
  const navigate = useNavigate();

  const { t } = useTranslation();

  const handlMoveToFirst = () => {
    if (!gallery.isFirstMonth(year, month)) {
      navigate(gallery.path(...gallery.firstMonth()));
    }
  };
  const handlMoveToPrevious = () => {
    if (!gallery.isFirstMonth(year, month)) {
      navigate(gallery.path(...gallery.previousMonth(year, month)));
    }
  };
  const handlMoveToNext = () => {
    if (!gallery.isLastMonth(year, month)) {
      navigate(gallery.path(...gallery.nextMonth(year, month)));
    }
  };
  const handlMoveToLast = () => {
    if (!gallery.isLastMonth(year, month)) {
      navigate(gallery.path(...gallery.lastMonth()));
    }
  };

  useKeyPress("Escape", () => {
    navigate(gallery.path(year));
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
          modalActive={modalActive}
        >
          {children}
        </Content>
      </Swipeable>
    </>
  );
};
export default Month;
