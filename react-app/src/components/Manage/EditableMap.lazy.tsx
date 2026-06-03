import React from "react";
import styled from "@emotion/styled";

// Lazy boundary for the admin coord-edit map. Pulls `leaflet` +
// `react-leaflet` out of the admin chunk — the rest of the
// PhotoDrawer renders fine without it. Suspense fallback is a
// fixed-height placeholder so the drawer doesn't reflow when the
// map finally arrives.
const EditableMap = React.lazy(() => import("./EditableMap"));

const Placeholder = styled.div`
  width: 100%;
  height: 240px;
  border-radius: 4px;
  border: 1px solid var(--inactive-color);
`;

interface Props {
  lat: number | null;
  lon: number | null;
  onChange: (next: { lat: number; lon: number }) => void;
  readOnly?: boolean;
}

const LazyEditableMap = (props: Props): React.ReactElement => (
  <React.Suspense fallback={<Placeholder />}>
    <EditableMap {...props} />
  </React.Suspense>
);

export default LazyEditableMap;
