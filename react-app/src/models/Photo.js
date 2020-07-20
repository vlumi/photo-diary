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

  const formatExposureTime = (time) => {
    if (time >= 1) {
      return `${time}s`;
    }
    const fraction = Math.round(1 / time);
    return `1/${fraction}s`;
  };

  const self = {
    id: () => photo.id,
    index: () => photo.index,
    title: () => photo.title,
    description: () => photo.description,
    taken: photo.taken,
    dimensions: photo.dimensions,
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
    formatExposure: () => {
      const focalLength = `ƒ=${photo.exposure.focalLength}mm`;
      const aperture = `ƒ/${photo.exposure.aperture}`;
      const exposureTime = formatExposureTime(photo.exposure.exposureTime);
      const iso = `ISO${photo.exposure.iso}`;
      return `${focalLength} ${aperture} ${exposureTime} ${iso}`;
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
    countryCode: () => photo.taken.location.country,
    countryName: () => countryData.getName(self.countryCode(), i18n.language),
    place: () =>
      [photo.taken.location.place, self.countryName()]
        .filter(Boolean)
        .join(", "),
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
