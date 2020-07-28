import format from "../utils/format";

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
    hour: () => photo.taken.instant.hour,
    minute: () => photo.taken.instant.minute,
    second: () => photo.taken.instant.second,
    thumbnailDimensions: () => {
      return { ...photo.dimensions.thumbnail };
    },
    ratio: () =>
      photo.dimensions.display.width / photo.dimensions.display.height,
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
    focalLength: () => photo.exposure.focalLength,
    aperture: () => photo.exposure.aperture,
    exposureTime: () => photo.exposure.exposureTime,
    iso: () => photo.exposure.iso,
    formatFocalLength: () =>
      photo.exposure.focalLength
        ? format.focalLength(photo.exposure.focalLength)
        : "",
    formatAperture: () =>
      photo.exposure.aperture ? format.aperture(photo.exposure.aperture) : "",
    formatExposureTime: () =>
      photo.exposure.exposureTime
        ? format.exposureTime(photo.exposure.exposureTime)
        : "",
    formatIso: () => (photo.exposure.iso ? `ISO${photo.exposure.iso}` : ""),
    formatMegapixels: () =>
      format.megapixels(
        photo.dimensions.original.width,
        photo.dimensions.original.height
      ),
    formatExposure: () => {
      return [
        self.formatFocalLength(),
        self.formatAperture(),
        self.formatExposureTime(),
        self.formatIso(),
        self.formatMegapixels(),
      ].join(" ");
    },
    cameraMake: () => photo.camera.make,
    hasCamera: () =>
      photo &&
      "camera" in photo &&
      (("make" in photo.camera && photo.camera.make) ||
        ("model" in photo.camera && photo.camera.model)),
    formatCamera: () => format.gear(photo.camera.make, photo.camera.model),
    hasLens: () =>
      photo &&
      "lens" in photo &&
      (("make" in photo.lens && photo.lens.make) ||
        ("model" in photo.lens && photo.lens.model)),
    formatLens: () => format.gear(photo.lens.make, photo.lens.model),
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
    countryName: (lang, countryData) =>
      self.hasCountry()
        ? format.countryName(self.countryCode(), lang, countryData)
        : "",
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
  };
  return self;
};
export default Photo;
