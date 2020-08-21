import format from "../lib/format";

const PhotoModel = (photoData) => {
  const importPhotoData = (photoData) => {
    if (
      !photoData ||
      !photoData.id ||
      !Number.isInteger(photoData.index) ||
      photoData.index < 0 ||
      !("taken" in photoData) ||
      !("instant" in photoData.taken) ||
      !photoData.taken.instant.year ||
      !photoData.taken.instant.month ||
      !photoData.taken.instant.day ||
      !("dimensions" in photoData) ||
      !("original" in photoData.dimensions) ||
      !("display" in photoData.dimensions) ||
      !("thumbnail" in photoData.dimensions)
    ) {
      return undefined;
    }
    return photoData;
  };

  const photo = importPhotoData(photoData);
  if (!photo) {
    return undefined;
  }

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
    weekday: () =>
      new Date(
        photo.taken.instant.year,
        photo.taken.instant.month - 1,
        photo.taken.instant.day
      ).getDay(),
    hour: () => photo.taken.instant.hour,
    minute: () => photo.taken.instant.minute,
    second: () => photo.taken.instant.second,
    formatDate: () => {
      return format.date({
        year: photo.taken.instant.year,
        month: photo.taken.instant.month,
        day: photo.taken.instant.day,
      });
    },
    formatTimestamp: () => {
      const ymd = format.date({
        year: photo.taken.instant.year,
        month: photo.taken.instant.month,
        day: photo.taken.instant.day,
      });
      const hms = format.time({
        hour: photo.taken.instant.hour,
        minute: photo.taken.instant.minute,
        second: photo.taken.instant.second,
      });
      return `${ymd} ${hms}`;
    },

    thumbnailDimensions: () => {
      return { ...photo.dimensions.thumbnail };
    },
    ratio: () =>
      photo.dimensions.display.width / photo.dimensions.display.height,

    focalLength: () => photo.exposure.focalLength,
    aperture: () => photo.exposure.aperture,
    exposureTime: () => photo.exposure.exposureTime,
    iso: () => photo.exposure.iso,
    exposureValue: () => {
      if (!photo.exposure.aperture || !photo.exposure.exposureTime) {
        return undefined;
      }
      // Round the closest half
      const round = (value) => Math.round(value * 2) / 2;
      const fullExposureValue = Math.log2(
        photo.exposure.aperture ** 2 / photo.exposure.exposureTime
      );
      return round(fullExposureValue);
    },
    lightValue: () => {
      if (!photo.exposure.aperture || !photo.exposure.exposureTime) {
        return undefined;
      }
      // Round the closest half
      const round = (value) => Math.round(value * 2) / 2;
      const fullExposureValue = Math.log2(
        photo.exposure.aperture ** 2 / photo.exposure.exposureTime
      );
      const fullLightValue = fullExposureValue + Math.log2(self.iso() / 100);
      return round(fullLightValue);
    },
    resolution: () =>
      Math.round(
        (photo.dimensions.original.width * photo.dimensions.original.height) /
          10 ** 6
      ),
    orientation: () => {
      const ratio =
        photo.dimensions.original.width / photo.dimensions.original.height;
      if (Math.abs(ratio - 1) < 0.01) {
        return "square";
      }
      if (ratio < 1) {
        return "portrait";
      }
      return "landscape";
    },

    cameraMake: () => photo.camera.make,
    hasCamera: () =>
      !!(
        "camera" in photo &&
        (("make" in photo.camera && photo.camera.make) ||
          ("model" in photo.camera && photo.camera.model))
      ),
    formatCamera: () => format.gear(photo.camera.make, photo.camera.model),
    hasLens: () =>
      !!(
        "lens" in photo &&
        (("make" in photo.lens && photo.lens.make) ||
          ("model" in photo.lens && photo.lens.model))
      ),
    formatLens: () => format.gear(photo.lens.make, photo.lens.model),
    formatGear: () => {
      const camera = self.formatCamera();
      const lens = self.formatLens();
      return [camera, lens].filter(Boolean).join(" + ");
    },

    hasCountry: () =>
      !!(
        "taken" in photo &&
        "location" in photo.taken &&
        "country" in photo.taken.location &&
        photo.taken.location.country
      ),
    countryCode: () => photo.taken.location.country,
    countryName: (lang, countryData) =>
      self.hasCountry()
        ? format.countryName(lang, countryData)(self.countryCode())
        : "",
    hasPlace: () =>
      !!(
        "taken" in photo &&
        "location" in photo.taken &&
        "place" in photo.taken.location &&
        photo.taken.location.place
      ),
    place: () => photo.taken.location.place,
    hasCoordinates: () =>
      !!(
        "taken" in photo &&
        "location" in photo.taken &&
        "coordinates" in photo.taken.location &&
        "latitude" in photo.taken.location.coordinates &&
        "longitude" in photo.taken.location.coordinates &&
        photo.taken.location.coordinates.latitude &&
        photo.taken.location.coordinates.longitude
      ),
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
      return format.coordinates(
        photo.taken.location.coordinates.latitude,
        photo.taken.location.coordinates.longitude
      );
    },

    path: (gallery) => {
      const parts = [gallery.path(...self.ymd())];
      parts.push(photo.id);
      return parts.join("/");
    },

    matches: (category, value) => {
      switch (category) {
        case "author":
          return (!value && !self.author()) || value === self.author();
        case "country":
          return value === self.countryCode();
        case "year":
          return Number(value) === self.year();
        case "year-month":
          return value === [self.year(), self.month()].join("-");
        case "month":
          return Number(value) === self.month();
        case "weekday":
          return Number(value) === self.weekday();
        case "hour":
          return Number(value) === self.hour();
        case "camera-make":
          return value === self.cameraMake();
        case "camera":
          return value === self.formatCamera();
        case "lens":
          return value === self.formatLens();
        case "camera-lens": {
          const [camera, lens] = JSON.parse(value);
          return (
            ((!camera && !self.hasCamera()) ||
              camera === self.formatCamera()) &&
            ((!lens && !self.hasLens()) || lens === self.formatLens())
          );
        }
        case "focal-length":
          return [value, Number(value)].includes(self.focalLength());
        case "aperture":
          return [value, Number(value)].includes(self.aperture());
        case "exposure-time":
          return [value, Number(value)].includes(self.exposureTime());
        case "iso":
          return [value, Number(value)].includes(self.iso());
        case "ev":
          return [value, Number(value)].includes(self.exposureValue());
        case "lv":
          return [value, Number(value)].includes(self.lightValue());
        case "resolution":
          return [value, Number(value)].includes(self.resolution());
        case "orientation":
          return value === self.orientation();
        default:
          return true;
      }
    },
    uniqueValues: () => {
      return {
        general: {
          author: new Set([self.author()]),
          country: new Set([self.countryCode()]),
        },
        time: {
          year: new Set([self.year()]),
          "year-month": new Set([[self.year(), self.month()].join("-")]),
          month: new Set([self.month()]),
          weekday: new Set([self.weekday()]),
          hour: new Set([self.hour()]),
        },
        gear: {
          "camera-make": new Set([self.cameraMake()]),
          camera: new Set([self.formatCamera()]),
          lens: new Set([self.formatLens()]),
          "camera-lens": new Set([
            JSON.stringify([self.formatCamera(), self.formatLens()]),
          ]),
        },
        exposure: {
          "focal-length": new Set([self.focalLength()]),
          aperture: new Set([self.aperture()]),
          "exposure-time": new Set([self.exposureTime()]),
          iso: new Set([self.iso()]),
          ev: new Set([self.exposureValue()]),
          lv: new Set([self.lightValue()]),
          resolution: new Set([self.resolution()]),
        },
      };
    },
  };
  return self;
};
export default PhotoModel;
