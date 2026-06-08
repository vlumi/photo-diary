import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import {
  BsSkipBackwardFill,
  BsCaretLeftFill,
  BsCaretRightFill,
  BsSkipForwardFill,
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
  photo: Photo;
  lang: string;
  previousPhoto?: Photo;
  nextPhoto?: Photo;
  firstPhoto?: Photo;
  lastPhoto?: Photo;
  position?: number;
  total: number;
  // Optional: intercept the prev/next click and run the carousel slide
  // animation instead of letting the Link navigate directly. First /
  // Last buttons skip animation by design (jumping multiple photos
  // would be jarring).
  onPrev?: () => void;
  onNext?: () => void;
}

const Navigation = ({
  gallery,
  photo,
  lang,
  previousPhoto,
  nextPhoto,
  firstPhoto,
  lastPhoto,
  position,
  total,
  onPrev,
  onNext,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const positionLabel =
    position !== undefined
      ? `${new Intl.NumberFormat(lang).format(position)} / ${new Intl.NumberFormat(lang).format(total)}`
      : "";
  const timestamp = photo.formatTimestamp();

  const prevVisibility = !previousPhoto || previousPhoto.id() === photo.id() ? "hidden" : "";
  const nextVisibility = !nextPhoto || nextPhoto.id() === photo.id() ? "hidden" : "";

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
          onClick={
            onPrev
              ? (e: React.MouseEvent) => {
                  e.preventDefault();
                  onPrev();
                }
              : undefined
          }
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
          onClick={
            onNext
              ? (e: React.MouseEvent) => {
                  e.preventDefault();
                  onNext();
                }
              : undefined
          }
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
