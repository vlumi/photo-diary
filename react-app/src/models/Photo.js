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
    formatFocalLength: () => `ƒ=${photo.exposure.focalLength}mm`,
    formatAperture: () => `ƒ/${photo.exposure.aperture}`,
    formatExposureTime: () => {
      const time = photo.exposure.exposureTime;
      if (time >= 1) {
        return `${time}s`;
      }
      const fraction = Math.round(1 / time);
      return `1/${fraction}s`;
    },
    formatIso: () => `ISO${photo.exposure.iso}`,
    formatMegapixels: () =>
      `${Math.round(
        (photo.dimensions.original.width * photo.dimensions.original.height) /
          10 ** 6
      )}MP`,
    formatExposure: () => {
      const focalLength = self.formatFocalLength();
      const aperture = self.formatAperture();
      const exposureTime = self.formatExposureTime();
      const iso = self.formatIso();
      const mpix = self.formatMegapixels();
      return `${focalLength} ${aperture} ${exposureTime} ${iso} ${mpix}`;
    },
    formatGear: () => {
      const camera = [photo.camera.make, photo.camera.model]
        .filter(Boolean)
        .join(" ");
      const lens = [photo.lens.make, photo.lens.model]
        .filter(Boolean)
        .join(" ");
      return [camera, lens].filter(Boolean).join(", ");
    },
    hasCountry: () =>
      photo &&
      "taken" in photo &&
      "location" in photo.taken &&
      "country" in photo.taken.location &&
      photo.taken.location.country,
    countryCode: () => photo.taken.location.country,
    countryName: () => countryData.getName(self.countryCode(), i18n.language),
    place: () =>
      [photo.taken.location.place, self.countryName()]
        .filter(Boolean)
        .join(", "),
    path: (gallery) => {
      const parts = [gallery.path(...self.ymd())];
      parts.push(photo.id);
      return parts.join("/");
    },
  };
  return self;
};

// const x = {
//   id: "20170812_130718_X100F_2880.jpg",
//   index: 2463,
//   title: "",
//   description: "",
//   taken: {
//     instant: {
//       timestamp: "2017-08-12 13:07:18 +0900",
//       year: 2017,
//       month: 8,
//       day: 12,
//       hour: 13,
//       minute: 7,
//       second: 18,
//     },
//     author: "Ville Misaki",
//     location: {
//       country: "jp",
//       place: "Kyoto railway museum",
//       coordinates: {},
//     },
//   },
//   camera: {
//     model: "FUJIFILM X100F",
//   },
//   lens: {},
//   exposure: {
//     focalLength: 23,
//     aperture: "4.0",
//     exposureTime: 0.01,
//     iso: "4000",
//   },
//   dimensions: {
//     original: {
//       width: 5871,
//       height: 3914,
//     },
//     display: {
//       width: 1000,
//       height: 1500,
//     },
//     thumbnail: {
//       width: 133,
//       height: 200,
//     },
//   },
// };
export default Photo;
