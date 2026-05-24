import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import {
  BsSkipBackwardFill,
  BsCaretLeftFill,
  BsFillCalendarFill,
  BsCaretRightFill,
  BsSkipForwardFill,
  BsArrowsFullscreen,
  BsFullscreenExit,
} from "react-icons/bs";

import Root from "../Navigation";
import Link from "../Link";
import UpLink from "../UpLink";

import type { Gallery } from "../../../models/GalleryModel";
import type { Photo } from "../../../models/PhotoModel";

const NavLink = styled(Link, {
  shouldForwardProp: (prop) => prop !== "$visibility",
})<{ $visibility: string }>`
  visibility: ${(props) => props.$visibility};
`;
const TitleContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;
const Title = styled.span`
  margin: 0 5px;
`;
const FullscreenButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 0;
  margin: 0;
`;

// Fullscreen API isn't supported in iOS Safari for arbitrary elements
// (only video) — surface the toggle only where it actually works.
const fullscreenSupported = (): boolean =>
  typeof document !== "undefined" && document.fullscreenEnabled === true;

const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.getElementById("root")?.requestFullscreen();
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
};

interface Props {
  gallery: Gallery;
  year: number;
  month: number;
  day: number;
  photo: Photo;
  lang: string;
}

const Navigation = ({
  gallery,
  year,
  month,
  day,
  photo,
  lang,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = React.useState(
    typeof document !== "undefined" && !!document.fullscreenElement
  );
  React.useEffect(() => {
    if (!fullscreenSupported()) return;
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const [firstYear, firstMonth, firstDay] = gallery.firstDay();
  const [lastYear, lastMonth, lastDay] = gallery.lastDay();

  const firstDayPhotos =
    firstYear !== undefined && firstMonth !== undefined && firstDay !== undefined
      ? gallery.photos(firstYear, firstMonth, firstDay)
      : [];
  const firstPhoto = firstDayPhotos[0];

  const previousPhoto = gallery.previousPhoto(year, month, day, photo);
  const nextPhoto = gallery.nextPhoto(year, month, day, photo);

  const prevVisibility =
    previousPhoto && previousPhoto === photo ? "hidden" : "";
  const nextVisibility = nextPhoto && nextPhoto === photo ? "hidden" : "";

  const lastDayPhotos =
    lastYear !== undefined && lastMonth !== undefined && lastDay !== undefined
      ? gallery.photos(lastYear, lastMonth, lastDay)
      : [];
  const lastPhoto = lastDayPhotos[lastDayPhotos.length - 1];
  return (
    <Root>
      <NavLink gallery={gallery} photo={firstPhoto} $visibility={prevVisibility}>
        <BsSkipBackwardFill />
      </NavLink>
      <NavLink
        gallery={gallery}
        photo={previousPhoto}
        $visibility={prevVisibility}
      >
        <BsCaretLeftFill />
      </NavLink>
      <UpLink
        gallery={gallery}
        year={year}
        month={month}
        aria-label={t("nav-up-to-month")}
        title={t("nav-up-to-month")}
      >
        <TitleContainer>
          <BsFillCalendarFill />
          <Title>
            #
            {photo ? new Intl.NumberFormat(lang).format(photo.index() + 1) : ""}
          </Title>
        </TitleContainer>
      </UpLink>
      <NavLink gallery={gallery} photo={nextPhoto} $visibility={nextVisibility}>
        <BsCaretRightFill />
      </NavLink>
      <NavLink gallery={gallery} photo={lastPhoto} $visibility={nextVisibility}>
        <BsSkipForwardFill />
      </NavLink>
      {fullscreenSupported() && (
        <FullscreenButton
          type="button"
          onClick={toggleFullScreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <BsFullscreenExit /> : <BsArrowsFullscreen />}
        </FullscreenButton>
      )}
    </Root>
  );
};
export default Navigation;
