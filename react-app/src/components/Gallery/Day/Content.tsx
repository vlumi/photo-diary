import React from "react";
import styled from "@emotion/styled";

import Thumbnails from "../Thumbnails";

import type { Gallery } from "../../../models/GalleryModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
`;

interface Props {
  children?: React.ReactNode;
  gallery: Gallery;
  year: number;
  month: number;
  day: number;
  lang: string;
  countryData: CountryData;
}

const Content = ({
  children,
  gallery,
  year,
  month,
  day,
  lang,
  countryData,
}: Props): React.ReactElement => {
  if (!gallery.includesDay(year, month, day)) {
    return <i>Empty</i>;
  }

  const renderContent = () => {
    return (
      <Thumbnails
        gallery={gallery}
        photos={gallery.photos(year, month, day)}
        lang={lang}
        countryData={countryData}
      />
    );
  };

  // TODO: epoch & epochMode
  return (
    <>
      {children}
      <Root>{renderContent()}</Root>
    </>
  );
};
export default Content;
