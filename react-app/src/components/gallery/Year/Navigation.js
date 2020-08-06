import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import {
  BsSkipBackwardFill,
  BsCaretLeftFill,
  BsFillHouseFill,
  BsCaretRightFill,
  BsSkipForwardFill,
} from "react-icons/bs";

import FormatDate from "../../FormatDate";

import Root from "../Navigation";
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

const Navigation = ({ gallery, year }) => {
  const prevVisibility = gallery.isFirstYear(year) ? "hidden" : "";
  const nextVisibility = gallery.isLastYear(year) ? "hidden" : "";

  const firstYear = gallery.firstYear();
  const previousYear = gallery.previousYear(year);
  const nextYear = gallery.nextYear(year);
  const lastYear = gallery.lastYear();
  return (
    <Root>
      <NavLink gallery={gallery} year={firstYear} visibility={prevVisibility}>
        <BsSkipBackwardFill />
      </NavLink>
      <NavLink
        gallery={gallery}
        year={previousYear}
        visibility={prevVisibility}
      >
        <BsCaretLeftFill />
      </NavLink>
      <Link gallery={gallery}>
        <TitleContainer>
          <BsFillHouseFill />
          <Title>
            <FormatDate year={year} />
          </Title>
        </TitleContainer>
      </Link>
      <NavLink gallery={gallery} year={nextYear} visibility={nextVisibility}>
        <BsCaretRightFill />
      </NavLink>
      <NavLink gallery={gallery} year={lastYear} visibility={nextVisibility}>
        <BsSkipForwardFill />
      </NavLink>
    </Root>
  );
};
Navigation.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default Navigation;
