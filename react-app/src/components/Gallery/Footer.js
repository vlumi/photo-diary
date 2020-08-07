import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

const Root = styled.div`
  margin: 10px;
  flex-grow: 0;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  flex-wrap: nowrap;
  overflow: hidden;
`;

const Footer = ({ children }) => {
  return <Root>{children}</Root>;
};
Footer.propTypes = {
  children: PropTypes.any.isRequired,
};
export default Footer;
