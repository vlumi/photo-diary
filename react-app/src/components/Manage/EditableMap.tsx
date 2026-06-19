import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import Leaflet from "leaflet";
import {
  MapContainer as Map,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";

const Root = styled.div<{ readOnly?: boolean }>`
  position: relative;
  width: 100%;
  height: 240px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--inactive-color);

  /* Editable mode: crosshair on the map (click-to-set), grab on
     the marker (drag-to-move). Locked mode: leaflet's default
     pan-grab cursor — no edit affordance. */
  ${({ readOnly }) =>
    readOnly
      ? ""
      : `
  .leaflet-container { cursor: crosshair; }
  .leaflet-container.leaflet-grab { cursor: crosshair; }
  .leaflet-container.leaflet-dragging { cursor: grabbing; }
  .leaflet-marker-icon { cursor: grab; }
  .leaflet-marker-icon:active { cursor: grabbing; }
  `}
`;

const LockBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 500;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.8em;
  pointer-events: auto;
  cursor: help;
`;

const DefaultIcon = Leaflet.icon({
  ...Leaflet.Icon.Default.prototype.options,
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
});
Leaflet.Marker.prototype.options.icon = DefaultIcon;

interface Props {
  lat: number | null;
  lon: number | null;
  // The drawer drives form state; the map writes back via this
  // single callback whenever the operator drags the marker or
  // clicks a new position on the map.
  onChange: (next: { lat: number; lon: number }) => void;
  // When true, the marker is non-draggable and clicking the map
  // is a no-op — operator can pan / zoom to look but can't edit.
  // Used when the EXIF-derived edit gate is engaged.
  readOnly?: boolean;
}

// Keeps the map view in sync with the form's lat/lon values. The
// react-leaflet <MapContainer> only uses `center` / `zoom` for
// initial setup; later prop changes don't move the view. So when
// the operator types new coordinates into the lat/lon inputs we
// have to push the new center into the Leaflet instance manually.
// Stable positionKey limits the effect to actual coordinate
// changes — without it, every parent re-render would re-pan the
// map and overwrite an in-flight marker drag.
const RecenterOnProps = ({
  lat,
  lon,
  positionKey,
}: {
  lat: number | null;
  lon: number | null;
  positionKey: string;
}): null => {
  const map = useMap();
  React.useEffect(() => {
    if (lat == null || lon == null) return;
    map.setView([lat, lon], map.getZoom(), { animate: false });
  }, [map, lat, lon, positionKey]);
  return null;
};

// Bubble click-on-map events to the drawer. Dragend uses the
// marker's own event handlers below; map-clicks (anywhere not on
// the marker) drop / move the marker to that point.
const ClickToSet = ({
  onChange,
}: {
  onChange: (next: { lat: number; lon: number }) => void;
}): null => {
  useMapEvents({
    click: (e) => {
      onChange({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
};

const NULL_ISLAND_FALLBACK: [number, number] = [0, 0];
const INITIAL_ZOOM = 12;
const FALLBACK_ZOOM = 2;

const EditableMap = ({
  lat,
  lon,
  onChange,
  readOnly,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const hasCoords = lat != null && lon != null;
  const initialCenter: [number, number] = hasCoords
    ? [lat, lon]
    : NULL_ISLAND_FALLBACK;
  const initialZoom = hasCoords ? INITIAL_ZOOM : FALLBACK_ZOOM;
  const positionKey =
    lat == null || lon == null ? "unset" : `${lat},${lon}`;
  // Drag-end handler on the marker writes the new lat/lon back to
  // the drawer. We use latlng instead of marker.getLatLng() so
  // we don't rely on a ref into the Leaflet instance.
  const markerHandlers = React.useMemo(
    () => ({
      dragend: (e: Leaflet.LeafletEvent) => {
        const target = e.target as Leaflet.Marker;
        const pos = target.getLatLng();
        onChange({ lat: pos.lat, lon: pos.lng });
      },
    }),
    [onChange]
  );

  return (
    <Root readOnly={readOnly}>
      {readOnly && (
        <LockBadge title={t("manage-photo-map-locked-hint")}>
          {`\u{1F512} ${t("manage-photo-map-locked")}`}
        </LockBadge>
      )}
      <Map
        center={initialCenter}
        zoom={initialZoom}
        style={{ height: "100%" }}
      >
        <TileLayer
          attribution='&amp;copy <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterOnProps lat={lat} lon={lon} positionKey={positionKey} />
        {!readOnly && <ClickToSet onChange={onChange} />}
        {hasCoords && (
          <Marker
            position={[lat, lon]}
            draggable={!readOnly}
            eventHandlers={readOnly ? undefined : markerHandlers}
          />
        )}
      </Map>
    </Root>
  );
};

export default EditableMap;
