import React from "react";
import styled from "@emotion/styled";
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

const Root = styled.div`
  width: 100%;
  height: 240px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--inactive-color);
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
    <Root>
      <Map
        center={initialCenter}
        zoom={initialZoom}
        style={{ height: "100%" }}
      >
        <TileLayer
          attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
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
