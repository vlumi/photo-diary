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

// When the map mounts inside a container whose final size isn't
// known yet (the metadata panel is `position: absolute` with
// `max-width`/`max-height` that resolve after layout), Leaflet
// renders against the initial container rect and the marker can
// land off-centre. After the panel settles, calling
// `invalidateSize({pan: false})` makes Leaflet re-measure while
// keeping the current view centre — no panning side-effect from
// the default `pan: true` (which was shifting the view north as
// the container grew).
//
// For the single-photo case, explicitly `setView` on the point
// after the resize so we never go through Leaflet's fitBounds
// heuristics for a zero-area bound (which were the original
// source of "map ends up north of pin"). Multi-photo maps leave
// the initial `bounds`-prop fit in place.
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
    const t = window.setTimeout(() => {
      map.invalidateSize({ pan: false });
      if (pointRef.current) {
        map.setView(pointRef.current, maxZoom, { animate: false });
      }
    }, 100);
    return () => window.clearTimeout(t);
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
  const positionKey = positions
    .map((p) => {
      if (Array.isArray(p)) return `${p[0]},${p[1]}`;
      if (typeof p === "object" && p !== null && "lat" in p && "lng" in p) {
        return `${(p as { lat: number; lng: number }).lat},${
          (p as { lat: number; lng: number }).lng
        }`;
      }
      return JSON.stringify(p);
    })
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
