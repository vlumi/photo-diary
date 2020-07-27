import React from "react";
import PropTypes from "prop-types";
import Leaflet from "leaflet";
import { Map, TileLayer, Marker, Polyline, Popup } from "react-leaflet";

import "leaflet/dist/leaflet.css";
// TODO: custom icons; first/last day
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";

import config from "../utils/config";

let DefaultIcon = Leaflet.icon({
  ...Leaflet.Icon.Default.prototype.options,
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
});
Leaflet.Marker.prototype.options.icon = DefaultIcon;

const MapContainer = ({ positions: photos }) => {
  if (photos.length === 0) {
    return <></>;
  }
  // TODO: group positions very close to each other; show as navigable list on popup
  const positions = photos.map((photo) => photo.coordinates());
  const bounds = Leaflet.latLngBounds(positions);
  return (
    <>
      <Map bounds={bounds} maxZoom="10">
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
                <span className="map-popup">
                  <img
                    src={thumbnailUrl}
                    width={dimensions.width / 2}
                    height={dimensions.height / 2}
                  />
                  <br />
                  {photo.formatDate()}
                </span>
              </Popup>
            </Marker>
          );
        })}
        <Polyline positions={positions} />
      </Map>
    </>
  );
};
MapContainer.propTypes = {
  positions: PropTypes.array.isRequired,
};
export default MapContainer;
