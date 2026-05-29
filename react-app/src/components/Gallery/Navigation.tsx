import React from "react";
import styled from "@emotion/styled";

import Link from "./Link";

// Shared sibling-navigation bar for Photo / Month / Year (path
// breadcrumb lives in the Title bar above).
const Root = styled.nav`
  position: sticky;
  top: 0;
  left: 0;
  z-index: 1;
  width: 100%;
  height: 50px;
  box-sizing: border-box;
  color: var(--header-color);
  background: var(--header-background);
  font-size: 24pt;
  margin: 0;
  padding: 0 56px;
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-items: center;
  & :link {
    color: var(--header-color);
  }
  & :visited {
    color: var(--header-color);
  }
`;

// Up affordance for one-tap scope climbing on Month and Year. Sits as a
// shaded pill at the left edge of the row — absolutely positioned so it
// doesn't widen the leftmost prev/skip group and the prev/next clusters
// stay symmetrical around the centre. Matches the Photo modal's
// `FloatingButton` look (semi-transparent dark fill + white icon) so
// "pop a level out" affordances feel uniform across the app.
export const UpButton = styled(Link)`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  text-decoration: none;
  &:hover {
    background: rgba(255, 255, 255, 0.28);
  }
`;

interface Props {
  children?: React.ReactNode;
}

const Navigation = ({ children }: Props): React.ReactElement => {
  return <Root>{children}</Root>;
};
export default Navigation;
