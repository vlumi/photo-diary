import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
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
import UpLink from "../UpLink";

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
      <NavLink gallery={gallery} year={firstYear} $visibility={prevVisibility}>
        <BsSkipBackwardFill />
      </NavLink>
      <NavLink
        gallery={gallery}
        year={previousYear}
        $visibility={prevVisibility}
      >
        <BsCaretLeftFill />
      </NavLink>
      <UpLink
        aria-label={t("nav-up-to-galleries")}
        title={t("nav-up-to-galleries")}
      >
        <TitleContainer>
          <BsFillHouseFill />
          <Title>
            <FormatDate year={year} />
          </Title>
        </TitleContainer>
      </UpLink>
      <NavLink gallery={gallery} year={nextYear} $visibility={nextVisibility}>
        <BsCaretRightFill />
      </NavLink>
      <NavLink gallery={gallery} year={lastYear} $visibility={nextVisibility}>
        <BsSkipForwardFill />
      </NavLink>
    </Root>
  );
};
export default Navigation;
