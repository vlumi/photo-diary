import format from "../lib/format";

interface Dimensions {
  width: number;
  height: number;
}

interface PhotoDataDimensions {
  original: Dimensions;
  display: Dimensions;
  thumbnail: Dimensions;
}

interface Instant {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}

interface Coordinates {
  latitude?: number;
  longitude?: number;
}

interface Location {
  country?: string;
  place?: string;
  coordinates?: Coordinates;
}

// Reverse-geocoded from coords; distinct from operator-set
// `country` / `place` above. Server resolves `place` per-lang.
interface Geocoded {
  countryCode?: string;
  state?: string;
  city?: string;
  district?: string;
  place?: string;
}

interface Taken {
  author?: string;
  instant: Instant;
  location?: Location;
}

interface Gear {
  make?: string;
  model?: string;
}

interface Exposure {
  focalLength?: number;
  aperture?: number;
  exposureTime?: number;
  iso?: number;
}

export interface PhotoData {
  id: string;
  index: number;
  title?: string;
  description?: string;
  taken: Taken;
  dimensions: PhotoDataDimensions;
  camera?: Gear;
  lens?: Gear;
  exposure?: Exposure;
  geocoded?: Geocoded;
}

interface CountryData {
  getName(code: string, lang: string): string | undefined;
}

interface GalleryLike {
  path: (year?: number, month?: number, day?: number) => string;
}

const PhotoModel = (photoData: unknown) => {
  const importPhotoData = (data: unknown): PhotoData | undefined => {
    if (!data || typeof data !== "object") {
      return undefined;
    }
    const d = data as Record<string, unknown>;
    const taken = d.taken as Record<string, unknown> | undefined;
    const instant = taken?.instant as Record<string, unknown> | undefined;
    const dimensions = d.dimensions as Record<string, unknown> | undefined;
    if (
      !d.id ||
      !Number.isInteger(d.index) ||
      (d.index as number) < 0 ||
      !taken ||
      !instant ||
      !instant.year ||
      !instant.month ||
      !instant.day ||
      !dimensions ||
      !("original" in dimensions) ||
      !("display" in dimensions) ||
      !("thumbnail" in dimensions)
    ) {
      return undefined;
    }
    return data as PhotoData;
  };

  const photo = importPhotoData(photoData);
  if (!photo) {
    return undefined;
  }

  const round = (value: number): number => Math.round(value * 2) / 2;

  const self = {
    id: (): string => photo.id,
    index: (): number => photo.index,
    title: (): string | undefined => photo.title,
    description: (): string | undefined => photo.description,
    author: (): string | undefined => photo.taken.author,

    ymd: (): [number, number, number] => [self.year(), self.month(), self.day()],
    year: (): number => photo.taken.instant.year,
    month: (): number => photo.taken.instant.month,
    day: (): number => photo.taken.instant.day,
    weekday: (): number =>
      new Date(
        photo.taken.instant.year,
        photo.taken.instant.month - 1,
        photo.taken.instant.day
      ).getDay(),
    hour: (): number | undefined => photo.taken.instant.hour,
    minute: (): number | undefined => photo.taken.instant.minute,
    second: (): number | undefined => photo.taken.instant.second,
    formatDate: (): string => {
      return format.date({
        year: photo.taken.instant.year,
        month: photo.taken.instant.month,
        day: photo.taken.instant.day,
      });
    },
    formatTimestamp: (): string => {
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

    thumbnailDimensions: (): Dimensions => {
      return { ...photo.dimensions.thumbnail };
    },
    ratio: (): number =>
      photo.dimensions.display.width / photo.dimensions.display.height,

    focalLength: (): number | undefined => photo.exposure?.focalLength,
    aperture: (): number | undefined => photo.exposure?.aperture,
    exposureTime: (): number | undefined => photo.exposure?.exposureTime,
    iso: (): number | undefined => photo.exposure?.iso,
    exposureValue: (): number | undefined => {
      const aperture = photo.exposure?.aperture;
      const exposureTime = photo.exposure?.exposureTime;
      if (!aperture || !exposureTime) {
        return undefined;
      }
      const fullExposureValue = Math.log2(aperture ** 2 / exposureTime);
      return round(fullExposureValue);
    },
    lightValue: (): number | undefined => {
      const aperture = photo.exposure?.aperture;
      const exposureTime = photo.exposure?.exposureTime;
      const iso = self.iso();
      if (!aperture || !exposureTime || !iso) {
        return undefined;
      }
      const fullExposureValue = Math.log2(aperture ** 2 / exposureTime);
      const fullLightValue = fullExposureValue + Math.log2(iso / 100);
      return round(fullLightValue);
    },
    resolution: (): number =>
      Math.round(
        (photo.dimensions.original.width * photo.dimensions.original.height) /
          10 ** 6
      ),
    orientation: (): "square" | "portrait" | "landscape" => {
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
    aspectRatio: (): string | undefined => {
      const aspectRatios = [
        { name: "1:1", ratio: 1 / 1 },
        { name: "7:6", ratio: 7 / 6 },
        { name: "5:4", ratio: 5 / 4 },
        { name: "11:8.5", ratio: 11 / 8.5 },
        { name: "4:3", ratio: 4 / 3 },
        { name: "7:5", ratio: 7 / 5 },
        { name: "3:2", ratio: 3 / 2 },
        { name: "14:9", ratio: 14 / 9 },
        { name: "16:10", ratio: 16 / 10 },
        { name: "16:9", ratio: 16 / 9 },
        { name: "1.85.1", ratio: 1.85 / 1 },
        { name: "2:1", ratio: 2 / 1 },
        { name: "2.35:1", ratio: 2.35 / 1 },
        { name: "65:24", ratio: 65 / 24 },
        { name: "3:1+", ratio: 3 / 1 },
      ];
      const ratio =
        photo.dimensions.original.width > photo.dimensions.original.height
          ? photo.dimensions.original.width / photo.dimensions.original.height
          : photo.dimensions.original.height / photo.dimensions.original.width;
      if (isNaN(ratio)) {
        return undefined;
      }
      for (const [i, current] of aspectRatios.entries()) {
        if (i === aspectRatios.length - 1) {
          return current.name;
        }
        if (ratio <= current.ratio) {
          return current.name;
        }
        if (
          ratio < aspectRatios[i + 1].ratio &&
          ratio - current.ratio <= aspectRatios[i + 1].ratio - ratio
        ) {
          return current.name;
        }
      }
      return "";
    },

    cameraMake: (): string | undefined => photo.camera?.make,
    hasCamera: (): boolean =>
      !!(photo.camera && (photo.camera.make || photo.camera.model)),
    formatCamera: (): string | undefined =>
      format.gear(photo.camera?.make, photo.camera?.model),
    hasLens: (): boolean =>
      !!(photo.lens && (photo.lens.make || photo.lens.model)),
    formatLens: (): string | undefined =>
      format.gear(photo.lens?.make, photo.lens?.model),
    formatGear: (): string => {
      const camera = self.formatCamera();
      const lens = self.formatLens();
      return [camera, lens].filter(Boolean).join(" + ");
    },

    hasCountry: (): boolean => !!photo.taken.location?.country,
    countryCode: (): string | undefined => photo.taken.location?.country,
    countryName: (lang: string, countryData: CountryData): string =>
      self.hasCountry() && self.countryCode()
        ? format.countryName(lang, countryData)(self.countryCode() as string)
        : "",
    hasPlace: (): boolean => !!photo.taken.location?.place,
    place: (): string | undefined => photo.taken.location?.place,
    hasGeocodedCity: (): boolean => !!photo.geocoded?.city,
    geocodedCity: (): string | undefined => photo.geocoded?.city,
    hasGeocodedCountry: (): boolean => !!photo.geocoded?.countryCode,
    geocodedCountryCode: (): string | undefined => photo.geocoded?.countryCode,
    geocodedCountryName: (lang: string, countryData: CountryData): string =>
      self.hasGeocodedCountry() && self.geocodedCountryCode()
        ? format.countryName(lang, countryData)(
          self.geocodedCountryCode() as string
        )
        : "",
    // Minimal city + country line; state / district aren't reliable
    // enough to render across languages.
    hasGeocodedAddress: (): boolean =>
      !!(photo.geocoded?.city || photo.geocoded?.countryCode),
    geocodedAddress: (lang: string, countryData: CountryData): string =>
      format.geocodedAddress(lang, {
        country: self.geocodedCountryName(lang, countryData),
        city: photo.geocoded?.city,
      }),
    hasCoordinates: (): boolean =>
      !!(
        photo.taken.location?.coordinates?.latitude &&
        photo.taken.location.coordinates.longitude
      ),
    coordinates: (): [number | "", number | ""] => [
      self.latitude(),
      self.longitude(),
    ],
    latitude: (): number | "" => {
      if (!self.hasCoordinates()) {
        return "";
      }
      return photo.taken.location?.coordinates?.latitude ?? "";
    },
    longitude: (): number | "" => {
      if (!self.hasCoordinates()) {
        return "";
      }
      return photo.taken.location?.coordinates?.longitude ?? "";
    },
    formatCoordinates: (): string => {
      if (!self.hasCoordinates()) {
        return "";
      }
      const coords = photo.taken.location?.coordinates;
      return format.coordinates(coords?.latitude ?? 0, coords?.longitude ?? 0);
    },

    path: (gallery: GalleryLike): string => {
      const parts = [gallery.path(...self.ymd())];
      parts.push(photo.id);
      return parts.join("/");
    },

    matches: (category: string, value: string | undefined): boolean => {
      switch (category) {
        case "author":
          return (!value && !self.author()) || value === self.author();
        case "country":
          return value === self.countryCode();
        case "city":
          return value === self.geocodedCity();
        case "geotagged":
          return value === "yes" ? self.hasCoordinates() : !self.hasCoordinates();
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
          const [camera, lens] = JSON.parse(value ?? "[]") as [
            string | null,
            string | null,
          ];
          return (
            ((!camera && !self.hasCamera()) ||
              camera === self.formatCamera()) &&
            ((!lens && !self.hasLens()) || lens === self.formatLens())
          );
        }
        case "focal-length":
          return [value, Number(value)].includes(self.focalLength() as never);
        case "aperture":
          return [value, Number(value)].includes(self.aperture() as never);
        case "exposure-time":
          return [value, Number(value)].includes(self.exposureTime() as never);
        case "iso":
          return [value, Number(value)].includes(self.iso() as never);
        case "ev":
          return [value, Number(value)].includes(
            self.exposureValue() as never
          );
        case "lv":
          return [value, Number(value)].includes(self.lightValue() as never);
        case "resolution":
          return [value, Number(value)].includes(self.resolution() as never);
        case "orientation":
          return value === self.orientation();
        case "aspect-ratio":
          return value === self.aspectRatio();
        default:
          return true;
      }
    },
    uniqueValues: () => {
      return {
        general: {
          author: new Set([self.author()]),
          country: new Set([self.countryCode()]),
          city: new Set(self.geocodedCity() ? [self.geocodedCity()] : []),
          geotagged: new Set([self.hasCoordinates() ? "yes" : "no"]),
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
          orientation: new Set([self.orientation()]),
          "aspect-ratio": new Set([self.aspectRatio()]),
        },
      };
    },
  };
  return self;
};

export type Photo = NonNullable<ReturnType<typeof PhotoModel>>;
export default PhotoModel;
