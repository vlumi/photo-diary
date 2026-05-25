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

import Root, { UpButton } from "../Navigation";
import Link from "../Link";

import type { Gallery } from "../../../models/GalleryModel";

const Group = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;
// Current month name (localised) shown in the middle of the bar
// so it doesn't read empty between the left and right control
// clusters. The breadcrumb above already shows the year, so the
// centre stays month-only — and avoids a hardcoded English-style
// "Month YYYY" order that wouldn't survive ja/fi locales.
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
  month: number;
}

const Navigation = ({
  gallery,
  year,
  month,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const prevVisibility = gallery.isFirstMonth(year, month) ? "hidden" : "";
  const nextVisibility = gallery.isLastMonth(year, month) ? "hidden" : "";

  const [firstYear, firstMonth] = gallery.firstMonth();
  const [previousYear, previousMonth] = gallery.previousMonth(year, month);
  const [nextYear, nextMonth] = gallery.nextMonth(year, month);
  const [lastYear, lastMonth] = gallery.lastMonth();
  return (
    <Root>
      <UpButton
        gallery={gallery}
        year={year}
        aria-label={String(t("nav-up"))}
        title={String(t("nav-up"))}
      >
        <BsArrowUp />
      </UpButton>
      <Group>
        <NavLink
          gallery={gallery}
          year={firstYear}
          month={firstMonth}
          $visibility={prevVisibility}
        >
          <BsSkipBackwardFill />
        </NavLink>
        <NavLink
          gallery={gallery}
          year={previousYear}
          month={previousMonth}
          $visibility={prevVisibility}
        >
          <BsCaretLeftFill />
        </NavLink>
      </Group>
      <Centre>{t(`month-long-${month}`)}</Centre>
      <Group>
        <NavLink
          gallery={gallery}
          year={nextYear}
          month={nextMonth}
          $visibility={nextVisibility}
        >
          <BsCaretRightFill />
        </NavLink>
        <NavLink
          gallery={gallery}
          year={lastYear}
          month={lastMonth}
          $visibility={nextVisibility}
        >
          <BsSkipForwardFill />
        </NavLink>
      </Group>
    </Root>
  );
};
export default Navigation;
