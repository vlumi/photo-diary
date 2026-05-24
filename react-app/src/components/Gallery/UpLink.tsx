import React from "react";
import styled from "@emotion/styled";
import { BsArrowReturnLeft } from "react-icons/bs";

import Link from "./Link";

import type { Gallery } from "../../models/GalleryModel";

// Wraps the centered title in each Navigation bar so it visibly
// reads as a back/up button: a small return arrow prepended to the
// existing icon, plus a hover border. The destination is whatever
// the consumer passes via gallery/year/month — same up-one-level
// semantics the title click already had, just discoverable now.
const StyledLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 10px;
  border-radius: 4px;
  border: 1px solid transparent;
  &:hover {
    border-color: var(--primary-color);
  }
`;
const BackIcon = styled.span`
  display: inline-flex;
  align-items: center;
  margin-right: 8px;
  font-size: 0.65em;
  opacity: 0.7;
`;

interface Props {
  gallery?: Gallery;
  year?: number;
  month?: number;
  children: React.ReactNode;
  "aria-label": string;
  title: string;
}

const UpLink = ({
  gallery,
  year,
  month,
  children,
  "aria-label": ariaLabel,
  title,
}: Props): React.ReactElement => (
  <StyledLink
    gallery={gallery}
    year={year}
    month={month}
    aria-label={ariaLabel}
    title={title}
  >
    <BackIcon aria-hidden="true">
      <BsArrowReturnLeft />
    </BackIcon>
    {children}
  </StyledLink>
);
export default UpLink;
