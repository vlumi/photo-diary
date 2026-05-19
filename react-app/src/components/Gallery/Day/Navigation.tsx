import React from "react";
import styled from "@emotion/styled";
import {
  BsSkipBackwardFill,
  BsCaretLeftFill,
  BsFillCalendarFill,
  BsCaretRightFill,
  BsSkipForwardFill,
} from "react-icons/bs";

import FormatDate from "../../FormatDate";

import Root from "../Navigation";
import Link from "../Link";

import type { Gallery } from "../../../models/GalleryModel";

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

interface Props {
  gallery: Gallery;
  year: number;
  month: number;
  day: number;
}

const Navigation = ({
  gallery,
  year,
  month,
  day,
}: Props): React.ReactElement => {
  const prevVisibility = gallery.isFirstDay(year, month, day) ? "hidden" : "";
  const nextVisibility = gallery.isLastDay(year, month, day) ? "hidden" : "";

  const [firstYear, firstMonth, firstDay] = gallery.firstDay();
  const [previousYear, previousMonth, previousDay] = gallery.previousDay(
    year,
    month,
    day
  );
  const [nextYear, nextMonth, nextDay] = gallery.nextDay(year, month, day);
  const [lastYear, lastMonth, lastDay] = gallery.lastDay();
  return (
    <Root>
      <NavLink
        gallery={gallery}
        year={firstYear}
        month={firstMonth}
        day={firstDay}
        $visibility={prevVisibility}
      >
        <BsSkipBackwardFill />
      </NavLink>
      <NavLink
        gallery={gallery}
        year={previousYear}
        month={previousMonth}
        day={previousDay}
        $visibility={prevVisibility}
      >
        <BsCaretLeftFill />
      </NavLink>
      <Link gallery={gallery} year={year} month={month}>
        <TitleContainer>
          <BsFillCalendarFill />
          <Title>
            <FormatDate year={year} month={month} day={day} />
          </Title>
        </TitleContainer>
      </Link>
      <NavLink
        gallery={gallery}
        year={nextYear}
        month={nextMonth}
        day={nextDay}
        $visibility={nextVisibility}
      >
        <BsCaretRightFill />
      </NavLink>
      <NavLink
        gallery={gallery}
        year={lastYear}
        month={lastMonth}
        day={lastDay}
        $visibility={nextVisibility}
      >
        <BsSkipForwardFill />
      </NavLink>
    </Root>
  );
};
export default Navigation;
