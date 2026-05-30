import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import calendar from "../../lib/calendar";

import type { Gallery } from "../../models/GalleryModel";

const Root = styled.div``;
const Part = styled.span`
  display: inline-block;
`;

interface Props {
  gallery: Gallery;
  year: number;
  month: number;
  day: number;
  format?: string;
  separator?: React.ReactNode;
}

const EpochAge = ({
  gallery,
  year,
  month,
  day,
  format = "short",
  separator = <br />,
}: Props): React.ReactElement | string => {
  const { t } = useTranslation();
  const epochYmd = gallery.epochYmd();
  if (!gallery.hasEpoch() || !epochYmd) {
    return "";
  }
  const epochDiffYmd = calendar.sinceEpochYmd(epochYmd, [year, month, day]);

  const partTitles = [`years-${format}`, `months-${format}`, `days-${format}`];
  const parts: string[] = [];
  for (let i = 0; i < epochDiffYmd.length; i++) {
    if (epochDiffYmd[i] > 0) {
      parts.push(String(t(partTitles[i], { count: epochDiffYmd[i] })));
    }
  }
  if (parts.length === 0) {
    return String(t(`days-${format}`, { count: 0 }));
  }

  return (
    <Root>
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          <Part>{part}</Part>
          {separator}
        </React.Fragment>
      ))}
    </Root>
  );
};
export default EpochAge;
