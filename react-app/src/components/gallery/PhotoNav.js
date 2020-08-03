import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import {
  BsSkipBackwardFill,
  BsCaretLeftFill,
  BsFillGrid3X3GapFill,
  BsCaretRightFill,
  BsSkipForwardFill,
} from "react-icons/bs";

import Link from "./Link";

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

const PhotoNav = ({ gallery, year, month, day, photo }) => {
  const [firstYear, firstMonth, firstDay] = gallery.firstDay();
  const [lastYear, lastMonth, lastDay] = gallery.lastDay();

  const firstDayPhotos = gallery.photos(firstYear, firstMonth, firstDay);
  const firstPhoto = firstDayPhotos[0];

  const previousPhoto = gallery.previousPhoto(year, month, day, photo);
  const nextPhoto = gallery.nextPhoto(year, month, day, photo);

  const prevVisibility =
    previousPhoto && previousPhoto === photo ? "hidden" : "";
  const nextVisibility = nextPhoto && nextPhoto === photo ? "hidden" : "";

  const lastDayPhotos = gallery.photos(lastYear, lastMonth, lastDay);
  const lastPhoto = lastDayPhotos[lastDayPhotos.length - 1];
  return (
    <h2 className="photo">
      <NavLink gallery={gallery} photo={firstPhoto} visibility={prevVisibility}>
        <BsSkipBackwardFill />
      </NavLink>
      <NavLink
        gallery={gallery}
        photo={previousPhoto}
        visibility={prevVisibility}
      >
        <BsCaretLeftFill />
      </NavLink>
      <Link gallery={gallery} year={year} month={month}>
        <TitleContainer>
          <BsFillGrid3X3GapFill />
          <Title>#{photo ? photo.index() + 1 : ""}</Title>
        </TitleContainer>
      </Link>
      <NavLink gallery={gallery} photo={nextPhoto} visibility={nextVisibility}>
        <BsCaretRightFill />
      </NavLink>
      <NavLink gallery={gallery} photo={lastPhoto} visibility={nextVisibility}>
        <BsSkipForwardFill />
      </NavLink>
    </h2>
  );
};
PhotoNav.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  photo: PropTypes.object.isRequired,
};
export default PhotoNav;
