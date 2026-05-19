import React from "react";
import styled from "@emotion/styled";

import Thumbnail from "./Thumbnail";

import type { Gallery } from "../../models/GalleryModel";
import type { Photo } from "../../models/PhotoModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

const Root = styled.div`
  vertical-align: top;
  display: flex;
  flex-wrap: nowrap;
`;

interface Props {
  children?: React.ReactNode;
  gallery: Gallery;
  photos: Photo[];
  lang: string;
  countryData: CountryData;
}

const Thumbnails = ({
  children,
  gallery,
  photos,
  lang,
  countryData,
}: Props): React.ReactElement => {
  return (
    <>
      {photos.map((photo, index) => {
        return (
          <Root key={photo.id()}>
            {index === 0 ? children : ""}
            <Thumbnail
              gallery={gallery}
              photo={photo}
              lang={lang}
              countryData={countryData}
            />
          </Root>
        );
      })}
    </>
  );
};
export default Thumbnails;
