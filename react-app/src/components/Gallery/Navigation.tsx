import React from "react";
import styled from "@emotion/styled";

// Calendar-level navigation bar shared by Photo / Month / Year.
// Now that the path/breadcrumb lives in the Title bar above, this
// row carries sibling navigation only: prev/skip on the left edge,
// next/skip + fullscreen on the right. Groups (left vs right) keep
// the controls clustered so the bar reads as two button stacks
// with empty centre rather than evenly-spread icons.
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
  padding: 0 12px;
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

interface Props {
  children?: React.ReactNode;
}

const Navigation = ({ children }: Props): React.ReactElement => {
  return <Root>{children}</Root>;
};
export default Navigation;
