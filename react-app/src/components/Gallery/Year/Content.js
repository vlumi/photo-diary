import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

import Month from "./Month";

import calendar from "../../../lib/calendar";

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
`;
const Calendar = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  max-width: 904px;
`;

const Content = ({ children, gallery, year }) => {
  return (
    <>
      {children}
      <Root>
        <Calendar>
          {calendar
            .months(year, ...gallery.firstMonth(), ...gallery.lastMonth())
            .map((month) => (
              <Month key={month} gallery={gallery} year={year} month={month} />
            ))}
        </Calendar>
      </Root>
    </>
  );
};
Content.propTypes = {
  children: PropTypes.any,
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
};
export default Content;
