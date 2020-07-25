import React from "react";
import PropTypes from "prop-types";
import Leaflet from "leaflet";
import { Map, TileLayer, Marker } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
let DefaultIcon = Leaflet.icon({
  ...Leaflet.Icon.Default.prototype.options,
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
});
Leaflet.Marker.prototype.options.icon = DefaultIcon;

const MapContainer = ({ positions }) => {
  if (positions.length === 0) {
    return <></>;
  }
  const bounds = Leaflet.latLngBounds(positions);
  return (
    <>
      <Map bounds={bounds} maxZoom="10">
        <TileLayer
          attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positions.map((position, index) => (
          <Marker key={index} position={position}></Marker>
        ))}
      </Map>
    </>
  );
};
MapContainer.propTypes = {
  positions: PropTypes.array.isRequired,
};
export default MapContainer;
