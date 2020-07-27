import { GeoCoord } from "geo-coord";

import config from "../utils/config";
import calendar from "../utils/calendar";

const joinMakeAndModel = (make, model) => {
  if (!make && !model) return "";
  if (!make) return model;
  if (!model) return make;
  if (model.startsWith(make)) {
    return model;
  }
  return [make, model].join(" ");
};

const Photo = (photoData) => {
  const importPhotoData = (photoData) => {
    return photoData;
  };

  const photo = importPhotoData(photoData);

  const self = {
    id: () => photo.id,
    index: () => photo.index,
    title: () => photo.title,
    description: () => photo.description,
    author: () => photo.taken.author,
    ymd: () => [self.year(), self.month(), self.day()],
    year: () => photo.taken.instant.year,
    month: () => photo.taken.instant.month,
    day: () => photo.taken.instant.day,
    thumbnailDimensions: () => {
      return { ...photo.dimensions.thumbnail };
    },
    ratio: () =>
      photo.dimensions.display.width / photo.dimensions.display.height,
    formatDate: () => {
      return calendar.formatDate({
        year: photo.taken.instant.year,
        month: photo.taken.instant.month,
        day: photo.taken.instant.day,
      });
    },
    formatTimestamp: () => {
      const ymd = calendar.formatDate({
        year: photo.taken.instant.year,
        month: photo.taken.instant.month,
        day: photo.taken.instant.day,
      });
      const hms = calendar.formatTime({
        hour: photo.taken.instant.hour,
        minute: photo.taken.instant.minute,
        second: photo.taken.instant.second,
      });
      return `${ymd} ${hms}`;
    },
    formatFocalLength: () =>
      photo.exposure.focalLength ? `ƒ=${photo.exposure.focalLength}mm` : "",
    formatAperture: () =>
      photo.exposure.aperture ? `ƒ/${photo.exposure.aperture}` : "",
    formatExposureTime: () => {
      const time = photo.exposure.exposureTime;
      if (!time) {
        return "";
      }
      if (time >= 1) {
        return `${time}s`;
      }
      const fraction = Math.round(1 / time);
      return `1/${fraction}s`;
    },
    formatIso: () => (photo.exposure.iso ? `ISO${photo.exposure.iso}` : ""),
    formatMegapixels: () => {
      const mpix = Math.round(
        (photo.dimensions.original.width * photo.dimensions.original.height) /
          10 ** 6
      );
      return mpix ? `${mpix}MP` : "";
    },
    formatExposure: () => {
      return [
        self.formatFocalLength(),
        self.formatAperture(),
        self.formatExposureTime(),
        self.formatIso(),
        self.formatMegapixels(),
      ].join(" ");
    },
    formatCamera: () => joinMakeAndModel(photo.camera.make, photo.camera.model),
    formatLens: () => joinMakeAndModel(photo.lens.make, photo.lens.model),
    formatGear: () => {
      const camera = self.formatCamera();
      const lens = self.formatLens();
      return [camera, lens].filter(Boolean).join(" + ");
    },
    hasCountry: () =>
      photo &&
      "taken" in photo &&
      "location" in photo.taken &&
      "country" in photo.taken.location &&
      photo.taken.location.country,
    countryCode: () => photo.taken.location.country,
    // TODO: this should not be here...
    countryName: (lang, countryData) =>
      countryData.getName(self.countryCode(), lang),
    hasPlace: () =>
      photo &&
      "taken" in photo &&
      "location" in photo.taken &&
      "place" in photo.taken.location &&
      photo.taken.location.place,
    place: () => photo.taken.location.place,
    hasCoordinates: () =>
      photo &&
      "taken" in photo &&
      "location" in photo.taken &&
      "coordinates" in photo.taken.location &&
      "latitude" in photo.taken.location.coordinates &&
      "longitude" in photo.taken.location.coordinates &&
      photo.taken.location.coordinates.latitude &&
      photo.taken.location.coordinates.longitude,
    coordinates: () => [self.latitude(), self.longitude()],
    latitude: () => {
      if (!self.hasCoordinates()) {
        return "";
      }
      return photo.taken.location.coordinates.latitude;
    },
    longitude: () => {
      if (!self.hasCoordinates()) {
        return "";
      }
      return photo.taken.location.coordinates.longitude;
    },
    formatCoordinates: () => {
      if (!self.hasCoordinates()) {
        return "";
      }
      return new GeoCoord(
        photo.taken.location.coordinates.latitude,
        photo.taken.location.coordinates.longitude
      ).toString();
    },
    path: (gallery) => {
      const parts = [gallery.path(...self.ymd())];
      parts.push(photo.id);
      return parts.join("/");
    },
  };
  return self;
};
export default Photo;
