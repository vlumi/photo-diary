import React from "react";
import styled from "@emotion/styled";

import type { Photo } from "../models/PhotoModel";

// Lazy boundary for the real MapContainer. Pulls `react-leaflet` + `leaflet`
// out of every chunk that imports it — without this, leaflet ends up in the
// main bundle (because the Year/Month/Day footers import MapContainer) plus
// duplicated in the Stats and Photo chunks. Centralizing the lazy import
// gives rollup one shared MapContainer chunk that every consumer pulls.
//
// Suspense fallback is a fixed-height placeholder that matches the map's
// default render height (or the explicit `height` prop) so the page doesn't
// reflow when the map arrives.
const MapContainer = React.lazy(() => import("./MapContainer"));

const Placeholder = styled.div<{ $height?: number }>`
  width: 100%;
  height: ${(props) => (props.$height ? props.$height : 400)}px;
  padding: 0;
  margin: 10px 0;
`;

interface Props {
  positions: Photo[];
  height?: number;
  maxZoom?: number;
  drawLine?: boolean;
  showLocate?: boolean;
  galleryId?: string;
  adminLink?: boolean;
}

const LazyMapContainer = (props: Props): React.ReactElement => (
  <React.Suspense fallback={<Placeholder $height={props.height} />}>
    <MapContainer {...props} />
  </React.Suspense>
);

export default LazyMapContainer;
