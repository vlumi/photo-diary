import React from "react";
import styled from "@emotion/styled";

const Root = styled.div`
  margin: 10px;
  flex-grow: 0;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  flex-wrap: nowrap;
  overflow: hidden;
`;

interface Props {
  children?: React.ReactNode;
}

const Footer = ({ children }: Props): React.ReactElement => {
  return <Root>{children}</Root>;
};
export default Footer;
