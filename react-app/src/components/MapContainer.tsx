import React from "react";
import styled from "@emotion/styled";
import Leaflet, { type LatLngExpression } from "leaflet";
import {
  MapContainer as Map,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";

import "leaflet/dist/leaflet.css";
import "react-leaflet-markercluster/styles";
// TODO: custom icons; first/last day
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";

import config from "../lib/config";
import type { Photo } from "../models/PhotoModel";

const Root = styled("div", { shouldForwardProp: (prop) => prop !== "$height" })<{
  $height?: number;
}>`
  width: 100%;
  height: ${(props) => (props.$height ? props.$height : 400)}px;
  padding: 0;
  margin: 0;
`;
const PopupContent = styled.span`
  text-align: center;
`;

const DefaultIcon = Leaflet.icon({
  ...Leaflet.Icon.Default.prototype.options,
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
});
Leaflet.Marker.prototype.options.icon = DefaultIcon;

const getPolyline = (positions: LatLngExpression[]) => {
  return <Polyline positions={positions} />;
};

// react-leaflet's `<MapContainer>` uses `center`, `zoom`, and
// `bounds` only as the initial setup; prop changes after mount
// don't move the view. The metadata panel keeps the map mounted
// while the user navigates between photos, so we need to push
// the new coordinates into Leaflet's instance manually when the
// position changes.
//
// Re-runs only when `positionKey` actually changes (a stable
// primitive derived from the coordinates), not on every parent
// render — otherwise the effect would re-fire constantly and
// the map view would animate on every render.
const Refit = ({
  singlePoint,
  maxZoom,
  positionKey,
}: {
  singlePoint: LatLngExpression | undefined;
  maxZoom: number;
  positionKey: string;
}): null => {
  const map = useMap();
  const pointRef = React.useRef(singlePoint);
  pointRef.current = singlePoint;
  React.useEffect(() => {
    if (pointRef.current) {
      map.setView(pointRef.current, maxZoom, { animate: false });
    }
  }, [map, positionKey, maxZoom]);
  return null;
};

interface Props {
  positions: Photo[];
  height?: number;
  maxZoom?: number;
  drawLine?: boolean;
}

const MapContainer = ({
  positions: photos,
  height,
  maxZoom,
  drawLine,
}: Props): React.ReactElement => {
  if (photos.length === 0) {
    return <></>;
  }
  // TODO: group positions very close to each other; show as navigable list on popup
  const positions = photos.map(
    (photo) => photo.coordinates() as LatLngExpression
  );
  const resolvedMaxZoom = maxZoom ? maxZoom : 14;
  const singlePhoto = positions.length === 1;
  // Single-photo: initialise with explicit center + zoom so the
  // map never goes through Leaflet's fitBounds path for a
  // zero-area bound. Multi-photo: use bounds to fit all
  // coordinates.
  const bounds = singlePhoto ? undefined : Leaflet.latLngBounds(positions);
  const center = singlePhoto ? positions[0] : undefined;
  const initialZoom = singlePhoto ? resolvedMaxZoom : undefined;
  // Stable key from the position signature so `Refit` re-runs
  // only when the actual location changes (navigating to a
  // different photo), not on every parent render.
  // `photo.coordinates()` returns `[lat, lng]` tuples, so a flat
  // string join is enough.
  const positionKey = (positions as [number, number][])
    .map(([lat, lng]) => `${lat},${lng}`)
    .join("|");
  return (
    <Root $height={height}>
      <Map
        bounds={bounds}
        center={center}
        zoom={initialZoom}
        maxZoom={resolvedMaxZoom}
        style={{ height: "100%" }}
      >
        <Refit
          singlePoint={center}
          maxZoom={resolvedMaxZoom}
          positionKey={positionKey}
        />
        <TileLayer
          attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup maxClusterRadius={40}>
          {photos.map((photo, index) => {
            const thumbnailUrl = `${
              config.PHOTO_ROOT_URL
            }thumbnail/${photo.id()}`;
            const dimensions = photo.thumbnailDimensions();
            return (
              <Marker
                key={index}
                position={photo.coordinates() as LatLngExpression}
              >
                <Popup>
                  <PopupContent>
                    <img
                      alt={photo.id()}
                      src={thumbnailUrl}
                      width={dimensions.width / 2}
                      height={dimensions.height / 2}
                    />
                    <br />
                    {photo.formatDate()}
                  </PopupContent>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
        {drawLine ? getPolyline(positions) : ""}
      </Map>
    </Root>
  );
};
export default MapContainer;
