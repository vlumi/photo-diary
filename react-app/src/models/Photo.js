import i18n from "i18next";

import calendar from "../utils/calendar";

const registerCountryData = (i18n) => {
  var countryData = require("i18n-iso-countries");
  try {
    countryData.registerLocale(
      require("i18n-iso-countries/langs/" + i18n.language + ".json")
    );
  } catch (err) {
    // Fall back to English
    countryData.registerLocale(require("i18n-iso-countries/langs/en.json"));
  }
  return countryData;
};
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

  const countryData = registerCountryData(i18n);
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
    countryName: () => countryData.getName(self.countryCode(), i18n.language),
    place: () => photo.taken.location.place,
    path: (gallery) => {
      const parts = [gallery.path(...self.ymd())];
      parts.push(photo.id);
      return parts.join("/");
    },
  };
  return self;
};
export default Photo;
