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
// computes its first `fitBounds` against the initial container
// rect and the marker can land off-centre. After the panel
// settles, calling `invalidateSize()` makes Leaflet re-measure;
// `fitBounds` re-runs the fit against the corrected size.
//
// `bounds`/`boundsOptions` are read via refs so the effect deps
// stay stable — otherwise every parent render produces new
// reference identities and the effect would fire on every render,
// queuing fitBounds calls and animating the view repeatedly. We
// re-run only when the position signature actually changes.
const InvalidateSizeOnMount = ({
  bounds,
  boundsOptions,
  positionKey,
}: {
  bounds: Leaflet.LatLngBoundsExpression;
  boundsOptions?: Leaflet.FitBoundsOptions;
  positionKey: string;
}): null => {
  const map = useMap();
  const boundsRef = React.useRef(bounds);
  const optionsRef = React.useRef(boundsOptions);
  boundsRef.current = bounds;
  optionsRef.current = boundsOptions;
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(boundsRef.current, {
        ...optionsRef.current,
        animate: false,
      });
    }, 100);
    return () => window.clearTimeout(t);
  }, [map, positionKey]);
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
  const bounds = Leaflet.latLngBounds(positions);
  // No asymmetric padding — fit the bounds centred on the pin
  // (or on the centroid for multi-photo). Yes, the default marker
  // icon's body extends north of the geographic anchor, but
  // shifting the *map view* to compensate ends up reading as
  // "the map is north of the actual pin", which is more
  // confusing than the icon body sitting slightly above centre.
  const boundsOptions: Leaflet.FitBoundsOptions = {
    maxZoom: resolvedMaxZoom,
  };
  // Stable key from the position signature so the
  // InvalidateSizeOnMount effect re-runs only when the actual
  // location changes (e.g. navigating to a different photo), not
  // on every parent render.
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
        boundsOptions={boundsOptions}
        maxZoom={resolvedMaxZoom}
        style={{ height: "100%" }}
      >
        <InvalidateSizeOnMount
          bounds={bounds}
          boundsOptions={boundsOptions}
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
