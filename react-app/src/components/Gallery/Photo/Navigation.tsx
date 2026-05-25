import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import {
  BsSkipBackwardFill,
  BsCaretLeftFill,
  BsCaretRightFill,
  BsSkipForwardFill,
  BsArrowUp,
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
  gap: 16px;
`;
// Two-line info block in the centre of the bar: date/time on the
// primary line (the bit the user wants visible without opening the
// metadata panel) and the photo's position (#N / total) on a
// smaller secondary line. Without this the bar reads as empty
// between the left and right control clusters — the breadcrumb's
// `#N` sits in the Title bar above the modal, but the modal Frame
// covers that, so we surface the same info here.
const Centre = styled.div`
  flex: 0 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--header-color);
  text-align: center;
`;
const TimestampLine = styled.div`
  font-size: 0.55em;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`;
const PositionLine = styled.div`
  font-size: 0.45em;
  color: var(--header-sub-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`;
const NavLink = styled(Link, {
  shouldForwardProp: (prop) => prop !== "$visibility",
})<{ $visibility: string }>`
  display: inline-flex;
  align-items: center;
  visibility: ${(props) => props.$visibility};
`;

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
  const totalPhotos = gallery.photos().length;
  const photoIndex = photo.index() + 1;
  const positionLabel = `${new Intl.NumberFormat(lang).format(
    photoIndex
  )} / ${new Intl.NumberFormat(lang).format(totalPhotos)}`;
  const timestamp = photo.formatTimestamp();

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
          year={year}
          month={month}
          $visibility=""
          aria-label={String(t("nav-up"))}
          title={String(t("nav-up"))}
        >
          <BsArrowUp />
        </NavLink>
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
      <Centre>
        <TimestampLine>{timestamp}</TimestampLine>
        <PositionLine aria-label={t("nav-photo-position")}>
          {positionLabel}
        </PositionLine>
      </Centre>
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
      </Group>
    </Root>
  );
};
export default Navigation;
