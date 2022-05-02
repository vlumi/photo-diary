import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import Leaflet from "leaflet";
import {
  MapContainer as Map,
  TileLayer,
  Marker,
  Polyline,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
// TODO: custom icons; first/last day
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";

import config from "../lib/config";

const Root = styled.div`
  width: 100%;
  height: ${(props) => (props.height ? props.height : 400)}px;
  padding: 0;
  margin: 10px 0;
`;
const PopupContent = styled.span`
  text-align: center;
`;

let DefaultIcon = Leaflet.icon({
  ...Leaflet.Icon.Default.prototype.options,
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
});
Leaflet.Marker.prototype.options.icon = DefaultIcon;

const getPolyline = (positions) => {
  return <Polyline positions={positions} />;
};

const MapContainer = ({ positions: photos, height, maxZoom, drawLine }) => {
  if (photos.length === 0) {
    return <></>;
  }
  // TODO: group positions very close to each other; show as navigable list on popup
  const positions = photos.map((photo) => photo.coordinates());
  const bounds = Leaflet.latLngBounds(positions);
  return (
    <Root height={height}>
      <Map
        bounds={bounds}
        maxZoom={maxZoom ? maxZoom : 14}
        style={{ height: "100%" }}
      >
        <TileLayer
          attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {photos.map((photo, index) => {
          const thumbnailUrl = `${
            config.PHOTO_ROOT_URL
          }thumbnail/${photo.id()}`;
          const dimensions = photo.thumbnailDimensions();
          return (
            <Marker key={index} position={photo.coordinates()}>
              <Popup>
                <PopupContent>
                  <img
                    alt={photo.id}
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
        {drawLine ? getPolyline(positions) : ""}
      </Map>
    </Root>
  );
};
MapContainer.propTypes = {
  positions: PropTypes.array.isRequired,
  height: PropTypes.number,
  maxZoom: PropTypes.number,
  drawLine: PropTypes.bool,
};
export default MapContainer;
