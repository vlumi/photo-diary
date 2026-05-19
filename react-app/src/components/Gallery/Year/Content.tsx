import React from "react";
import styled from "@emotion/styled";

import Month from "./Month";

import calendar from "../../../lib/calendar";

import type { Gallery } from "../../../models/GalleryModel";

type ActiveTheme = { get: (name: string) => string };

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

interface Props {
  children?: React.ReactNode;
  gallery: Gallery;
  year: number;
  theme: ActiveTheme;
}

const Content = ({
  children,
  gallery,
  year,
  theme,
}: Props): React.ReactElement => {
  const maxCount = gallery.maxDayCount(year);
  return (
    <>
      {children}
      <Root>
        <Calendar>
          {calendar
            .months(year, ...gallery.firstMonth(), ...gallery.lastMonth())
            .map((month) => (
              <Month
                key={month}
                gallery={gallery}
                year={year}
                month={month}
                maxCount={maxCount}
                theme={theme}
              />
            ))}
        </Calendar>
      </Root>
    </>
  );
};
export default Content;
