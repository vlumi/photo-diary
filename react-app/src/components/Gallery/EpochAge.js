import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useTranslation } from "react-i18next";

import calendar from "../../lib/calendar";

const Root = styled.div``;
const Part = styled.span`
  display: inline-block;
`;

const EpochAge = ({
  gallery,
  year,
  month,
  day,
  format = "short",
  separator = <br />,
}) => {
  const { t } = useTranslation();
  if (!gallery.hasEpoch()) {
    return "";
  }
  const epochDiffYmd = calendar.sinceEpochYmd(gallery.epochYmd(), [
    year,
    month,
    day,
  ]);

  const partTitles = [`years-${format}`, `months-${format}`, `days-${format}`];
  const parts = [];
  for (const i in [...Array(epochDiffYmd.length).keys()]) {
    if (epochDiffYmd[i] > 0) {
      parts.push(`${t(partTitles[i], { count: epochDiffYmd[i] })}`);
    }
  }
  if (parts.length === 0) {
    return "0" + t(`days-${format}`);
  }

  return (
    <Root>
      {parts.map((part, index) => (
        <>
          <Part key={`age-${year}${month}${day}${index}`}>{part}</Part>
          {separator}
        </>
      ))}
    </Root>
  );
};
EpochAge.propTypes = {
  gallery: PropTypes.object.isRequired,
  year: PropTypes.number.isRequired,
  month: PropTypes.number.isRequired,
  day: PropTypes.number.isRequired,
  format: PropTypes.string,
  separator: PropTypes.any,
};
export default EpochAge;
