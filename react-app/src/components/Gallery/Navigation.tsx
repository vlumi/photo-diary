import React from "react";
import styled from "@emotion/styled";

const Root = styled.h2`
  position: sticky;
  top: 0;
  left: 0;
  z-index: 1;
  width: 100%;
  height: 50px;
  color: var(--header-color);
  background: var(--header-background);
  font-size: 24pt;
  font-weight: bold;
  text-align: center;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-items: center;

  > * {
    flex-grow: 1;
    flex-shrink: 1;
    vertical-align: middle;
    position: relative;
    display: inline;
  }
  & :link {
    position: relative;
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
