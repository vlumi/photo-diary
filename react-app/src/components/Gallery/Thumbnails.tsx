import React from "react";
import styled from "@emotion/styled";

import Thumbnail from "./Thumbnail";

import type { Gallery } from "../../models/GalleryModel";
import type { Photo } from "../../models/PhotoModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

// Each photo gets its own `<Root>` (so the outer `flex-wrap` can break
// between photos as the viewport narrows). `$highlighted` tints every
// such Root for the day being highlighted — `color-mix` produces a
// semi-transparent primary-color band that reads as "this group of
// thumbnails belongs to the highlighted day" across the wrap, without
// needing to restructure the layout to nest the day's photos under a
// single wrapper.
const Root = styled.div<{ $highlighted?: boolean }>`
  vertical-align: top;
  display: flex;
  flex-wrap: nowrap;
  ${({ $highlighted }) =>
    $highlighted
      ? "background: color-mix(in srgb, var(--primary-color) 18%, transparent);"
      : ""}
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
            />
          </Root>
        );
      })}
    </>
  );
};
export default Thumbnails;
