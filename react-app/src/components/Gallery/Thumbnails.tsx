import React from "react";
import styled from "@emotion/styled";

import Thumbnail from "./Thumbnail";

import type { Gallery } from "../../models/GalleryModel";
import type { Photo } from "../../models/PhotoModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

// Each per-photo Root is a flex sibling in the Month's wrap-flex. When
// a day is highlighted (`/g/.../year/month/day` URL), every Root for
// that day's photos gets `--header-background` as its background —
// the same dark band colour the Navigation row and the day chip use.
// The 1 px margins inside each Root (around the photo mat and around
// the chip) expose that dark backdrop on all four sides, so the day
// group reads as a single dark-matted frame with the chip seamlessly
// continuous with the surrounding margins — no asymmetric "dark top,
// light side" effect.
const Root = styled.div<{ $highlighted?: boolean }>`
  vertical-align: top;
  display: flex;
  flex-wrap: nowrap;
  ${({ $highlighted }) =>
    $highlighted ? "background: var(--header-background);" : ""}
`;

interface Props {
  children?: React.ReactNode;
  gallery: Gallery;
  photos: Photo[];
  lang: string;
  countryData: CountryData;
  highlighted?: boolean;
}

const Thumbnails = ({
  children,
  gallery,
  photos,
  lang,
  countryData,
  highlighted,
}: Props): React.ReactElement => {
  return (
    <>
      {photos.map((photo, index) => {
        return (
          <Root key={photo.id()} $highlighted={highlighted}>
            {index === 0 ? children : ""}
            <Thumbnail
              gallery={gallery}
              photo={photo}
              lang={lang}
              countryData={countryData}
              highlighted={highlighted}
            />
          </Root>
        );
      })}
    </>
  );
};
export default Thumbnails;
