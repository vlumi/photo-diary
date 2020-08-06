import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import {
  BsSkipBackwardFill,
  BsCaretLeftFill,
  BsFillCalendarFill,
  BsCaretRightFill,
  BsSkipForwardFill,
} from "react-icons/bs";

import FormatDate from "../../FormatDate";

import Link from "../Link";

const NavLink = styled(Link)`
  visibility: ${(props) => props.visibility};
`;
const TitleContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;
const Title = styled.span`
  margin: 0 5px;
`;

const Navigation = ({ gallery, year, month }) => {
  const prevVisibility = gallery.isFirstMonth(year, month) ? "hidden" : "";
  const nextVisibility = gallery.isLastMonth(year, month) ? "hidden" : "";

  const [firstYear, firstMonth] = gallery.firstMonth();
  const [previousYear, previousMonth] = gallery.previousMonth(year, month);
  const [nextYear, nextMonth] = gallery.nextMonth(year, month);
  const [lastYear, lastMonth] = gallery.lastMonth();
  return (
    <h2>
      <NavLink
        gallery={gallery}
        year={firstYear}
        month={firstMonth}
        visibility={prevVisibility}
      >
        <BsSkipBackwardFill />
      </NavLink>
      <NavLink
        gallery={gallery}
        year={previousYear}
        month={previousMonth}
        visibility={prevVisibility}
      >
        <BsCaretLeftFill />
      </NavLink>
      <Link gallery={gallery} year={year}>
        <TitleContainer>
          <BsFillCalendarFill />
          <Title>
            <FormatDate year={year} month={month} />
          </Title>
        </TitleContainer>
      </Link>
      <NavLink
        gallery={gallery}
        year={nextYear}
        month={nextMonth}
        visibility={nextVisibility}
      >
        <BsCaretRightFill />
      </NavLink>
      <NavLink
        gallery={gallery}
        year={lastYear}
        month={lastMonth}
        visibility={nextVisibility}
      >
        <BsSkipForwardFill />
      </NavLink>
    </h2>
  );
};
Navigation.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
};
export default Navigation;
