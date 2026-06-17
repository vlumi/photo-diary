import React from "react";
import styled from "@emotion/styled";
import { Global, css } from "@emotion/react";
import { useTranslation } from "react-i18next";
import { BsGeoAltFill } from "react-icons/bs";
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
  position: relative;
`;
const PopupContent = styled.span`
  text-align: center;
`;

// react-leaflet-markercluster ships pastel fills (green / yellow /
// orange, alpha 0.6) that wash out on neutral / dark themes — and
// disappear entirely on the grayscale theme, where the page-wide
// `filter: grayscale(100%)` desaturates the otherwise-distinct
// hues into near-identical mid-grays that blend into the OSM tile
// layer. Override every cluster bucket with the theme's
// --primary-color + --header-color, plus a 2px --header-color
// border so the cluster stays distinct against whatever the tile
// layer paints behind it. The bucket-size colour coding is gone;
// the inline count + cluster size still signal magnitude (#590).
const mapClusterStyles = css`
  .marker-cluster {
    background-clip: padding-box;
    border-radius: 20px;
    background: color-mix(in srgb, var(--primary-color) 50%, transparent);
  }
  .marker-cluster div {
    width: 30px;
    height: 30px;
    margin-left: 5px;
    margin-top: 5px;
    text-align: center;
    border-radius: 15px;
    font: bold 12px "Helvetica Neue", Arial, Helvetica, sans-serif;
    background: var(--primary-color);
    color: var(--header-color);
    border: 2px solid var(--header-color);
    box-shadow: 0 0 0 1px var(--primary-color);
    box-sizing: border-box;
  }
  .marker-cluster span {
    line-height: 26px;
  }
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
// don't move the view. Two consumers keep the map mounted across
// position changes:
//
//   - MetadataPanel pins to a single photo's coords; navigating
//     between photos changes `singlePoint` and we re-`setView`.
//   - Title-bar MapModal (#321) stays open across year/month nav.
//     `boundsLatLngs` covers the new scope's pin set and we call
//     `fitBounds` to refit.
//
// Re-runs only when `positionKey` actually changes (a stable
// primitive derived from the coordinates), not on every parent
// render — otherwise the effect would re-fire constantly and
// the map view would animate on every render.
const Refit = ({
  singlePoint,
  boundsLatLngs,
  maxZoom,
  positionKey,
}: {
  singlePoint: LatLngExpression | undefined;
  boundsLatLngs: LatLngExpression[] | undefined;
  maxZoom: number;
  positionKey: string;
}): null => {
  const map = useMap();
  const pointRef = React.useRef(singlePoint);
  pointRef.current = singlePoint;
  const boundsRef = React.useRef(boundsLatLngs);
  boundsRef.current = boundsLatLngs;
  React.useEffect(() => {
    if (pointRef.current) {
      map.setView(pointRef.current, maxZoom, { animate: false });
      return;
    }
    if (boundsRef.current && boundsRef.current.length > 0) {
      map.fitBounds(Leaflet.latLngBounds(boundsRef.current), {
        animate: false,
      });
    }
  }, [map, positionKey, maxZoom]);
  return null;
};

// "You are here" marker. Inline-styled DivIcon so no extra CSS
// asset / scoping needed; visually distinct from the default
// photo-pin marker (blue dot + halo vs leaflet's blue droplet).
const userPositionIcon = Leaflet.divIcon({
  className: "",
  html:
    '<div style="width:16px;height:16px;border-radius:50%;' +
    "background:#1f7aff;border:3px solid #fff;" +
    'box-shadow:0 0 0 2px rgba(31,122,255,0.55);"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});
const LocateButtonOverlay = styled.button`
  position: absolute;
  top: 80px;
  left: 10px;
  z-index: 1000;
  width: 34px;
  height: 34px;
  border-radius: 4px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  background: #fff;
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  &:hover:not(:disabled) {
    background: #f4f4f4;
  }
  &:disabled {
    color: #aaa;
    cursor: not-allowed;
  }
`;
const LocateControl = ({
  onLocated,
}: {
  onLocated: (pos: LatLngExpression) => void;
}): React.ReactElement | null => {
  const map = useMap();
  const { t } = useTranslation();
  const [status, setStatus] = React.useState<"idle" | "pending" | "denied">(
    "idle"
  );
  // Geolocation requires a secure context (HTTPS / localhost). On
  // an unsecured dev origin the API exists but rejects every call —
  // hide the button rather than offer a dead control.
  if (
    typeof window === "undefined" ||
    !navigator.geolocation ||
    !window.isSecureContext
  ) {
    return null;
  }
  const locate = () => {
    setStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: LatLngExpression = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        onLocated(coords);
        map.setView(coords, Math.max(map.getZoom(), 14), { animate: true });
        setStatus("idle");
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "idle");
      },
      { timeout: 10_000, maximumAge: 60_000 }
    );
  };
  const label = String(
    status === "denied" ? t("map-locate-me-denied") : t("map-locate-me")
  );
  return (
    <LocateButtonOverlay
      type="button"
      onClick={locate}
      disabled={status !== "idle"}
      aria-label={label}
      title={label}
    >
      <BsGeoAltFill aria-hidden />
    </LocateButtonOverlay>
  );
};

interface Props {
  positions: Photo[];
  height?: number;
  maxZoom?: number;
  drawLine?: boolean;
  // Show the "Locate me" overlay button (#545). Defaults off — only
  // surfaces on MapModal, not on per-photo metadata-panel maps.
  showLocate?: boolean;
}

const MapContainer = ({
  positions: photos,
  height,
  maxZoom,
  drawLine,
  showLocate,
}: Props): React.ReactElement => {
  const [userPosition, setUserPosition] =
    React.useState<LatLngExpression | undefined>(undefined);
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
      <Global styles={mapClusterStyles} />
      <Map
        bounds={bounds}
        center={center}
        zoom={initialZoom}
        maxZoom={resolvedMaxZoom}
        style={{ height: "100%" }}
      >
        <Refit
          singlePoint={center}
          boundsLatLngs={singlePhoto ? undefined : positions}
          maxZoom={resolvedMaxZoom}
          positionKey={positionKey}
        />
        {showLocate && (
          <LocateControl onLocated={(pos) => setUserPosition(pos)} />
        )}
        {userPosition && (
          <Marker position={userPosition} icon={userPositionIcon} />
        )}
        <TileLayer
          attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup
          maxClusterRadius={20}
          spiderfyOnMaxZoom={true}
        >
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
