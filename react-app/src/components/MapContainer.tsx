import React from "react";
import styled from "@emotion/styled";
import Leaflet, { type LatLngExpression } from "leaflet";
import {
  MapContainer as Map,
  TileLayer,
  Marker,
  Polyline,
  Popup,
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
  margin: 10px 0;
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
  const singlePhoto = positions.length === 1;
  const resolvedMaxZoom = maxZoom ? maxZoom : 14;
  const bounds = Leaflet.latLngBounds(positions);
  // Default Leaflet markers are anchored at the bottom tip (the
  // geographic point sits at the icon's bottom). Centring the map
  // exactly on the point puts the marker's body (41px tall)
  // entirely above the centre — visually the pin reads as "north
  // of centre". For the single-photo case, fit the bounds with
  // extra padding at the top so the point shifts toward the
  // bottom of the visible area, leaving the marker body centred
  // on the map. Multi-photo maps fit naturally.
  const boundsOptions = singlePhoto
    ? {
        paddingTopLeft: [0, 40] as [number, number],
        paddingBottomRight: [0, 0] as [number, number],
        maxZoom: resolvedMaxZoom,
      }
    : undefined;
  return (
    <Root $height={height}>
      <Map
        bounds={bounds}
        boundsOptions={boundsOptions}
        maxZoom={resolvedMaxZoom}
        style={{ height: "100%" }}
      >
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
