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

import Root from "../Navigation";
import Link from "../Link";
import FormatDate from "../../FormatDate";

import type { Gallery } from "../../../models/GalleryModel";

const Group = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;
// Current year shown in the middle of the bar. The breadcrumb above
// has it too, but the bar otherwise reads as empty between the
// left and right control clusters — restore the visual centre.
const Centre = styled.div`
  flex: 0 1 auto;
  min-width: 0;
  font-size: 0.7em;
  color: var(--header-sub-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
}

const Navigation = ({ gallery, year }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const prevVisibility = gallery.isFirstYear(year) ? "hidden" : "";
  const nextVisibility = gallery.isLastYear(year) ? "hidden" : "";

  const firstYear = gallery.firstYear();
  const previousYear = gallery.previousYear(year);
  const nextYear = gallery.nextYear(year);
  const lastYear = gallery.lastYear();
  return (
    <Root>
      <Group>
        <NavLink
          $visibility=""
          aria-label={String(t("nav-up"))}
          title={String(t("nav-up"))}
        >
          <BsArrowUp />
        </NavLink>
        <NavLink
          gallery={gallery}
          year={firstYear}
          $visibility={prevVisibility}
        >
          <BsSkipBackwardFill />
        </NavLink>
        <NavLink
          gallery={gallery}
          year={previousYear}
          $visibility={prevVisibility}
        >
          <BsCaretLeftFill />
        </NavLink>
      </Group>
      <Centre>
        <FormatDate year={year} />
      </Centre>
      <Group>
        <NavLink
          gallery={gallery}
          year={nextYear}
          $visibility={nextVisibility}
        >
          <BsCaretRightFill />
        </NavLink>
        <NavLink
          gallery={gallery}
          year={lastYear}
          $visibility={nextVisibility}
        >
          <BsSkipForwardFill />
        </NavLink>
      </Group>
    </Root>
  );
};
export default Navigation;
