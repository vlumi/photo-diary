import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import {
  BsSkipBackwardFill,
  BsCaretLeftFill,
  BsCaretRightFill,
  BsSkipForwardFill,
  BsArrowsFullscreen,
  BsFullscreenExit,
  BsXLg,
} from "react-icons/bs";

import SharedRoot from "../Navigation";
import Link from "../Link";

import type { Gallery } from "../../../models/GalleryModel";
import type { Photo } from "../../../models/PhotoModel";

// Photo lives inside a position:fixed modal — the shared Root's
// `position: sticky; top: 0` has no scrolling ancestor here and on
// mobile Chrome it interacts badly with body scroll (the bar
// appears to "fall off" the top of the modal). Override to a
// regular block in the flex column.
const Root = styled(SharedRoot)`
  position: relative;
  top: auto;
  left: auto;
  flex: 0 0 auto;
`;
const Group = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;
// Photo position indicator in the centre of the bar. Without it the
// bar reads as empty between the left and right control clusters
// (the breadcrumb's `#N` sits in the Title bar above the modal,
// not inside the modal itself).
const Centre = styled.div`
  flex: 0 1 auto;
  min-width: 0;
  font-size: 0.6em;
  color: var(--header-sub-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
// Tools sub-group sits in the right group, slightly separated from
// the next/skip-next nav arrows so the close + fullscreen buttons
// read as "modal chrome" rather than another pair of nav controls.
const Tools = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 18px;
`;
const NavLink = styled(Link, {
  shouldForwardProp: (prop) => prop !== "$visibility",
})<{ $visibility: string }>`
  display: inline-flex;
  align-items: center;
  visibility: ${(props) => props.$visibility};
`;
const IconButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 0;
  margin: 0;
  &:hover {
    color: var(--primary-color);
  }
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
  onClose: () => void;
}

const Navigation = ({
  gallery,
  year,
  month,
  day,
  photo,
  lang,
  onClose,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const totalPhotos = gallery.photos().length;
  const photoIndex = photo.index() + 1;
  const positionLabel = `${new Intl.NumberFormat(lang).format(
    photoIndex
  )} / ${new Intl.NumberFormat(lang).format(totalPhotos)}`;
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
      <Group>
        <NavLink
          gallery={gallery}
          photo={firstPhoto}
          $visibility={prevVisibility}
        >
          <BsSkipBackwardFill />
        </NavLink>
        <NavLink
          gallery={gallery}
          photo={previousPhoto}
          $visibility={prevVisibility}
        >
          <BsCaretLeftFill />
        </NavLink>
      </Group>
      <Centre aria-label={t("nav-photo-position")}>{positionLabel}</Centre>
      <Group>
        <NavLink
          gallery={gallery}
          photo={nextPhoto}
          $visibility={nextVisibility}
        >
          <BsCaretRightFill />
        </NavLink>
        <NavLink
          gallery={gallery}
          photo={lastPhoto}
          $visibility={nextVisibility}
        >
          <BsSkipForwardFill />
        </NavLink>
        <Tools>
          {fullscreenSupported() && (
            <IconButton
              type="button"
              onClick={toggleFullScreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <BsFullscreenExit /> : <BsArrowsFullscreen />}
            </IconButton>
          )}
          <IconButton
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            title={t("close")}
          >
            <BsXLg />
          </IconButton>
        </Tools>
      </Group>
    </Root>
  );
};
export default Navigation;
