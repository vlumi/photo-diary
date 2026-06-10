import calendar from "../lib/calendar";
import format from "../lib/format";
import collection from "../lib/collection";
import config from "../lib/config";

import type { Photo } from "./PhotoModel";

interface GalleryData {
  id: string;
  title?: string;
  description?: string;
  titleLocalized?: Record<string, string>;
  descriptionLocalized?: Record<string, string>;
  defaultLanguage?: string | null;
  icon?: string;
  epoch?: Date | string;
  epochType?: string;
  theme?: string;
  hostname?: RegExp | string;
  initialView?: string;
  hideMap?: boolean;
  photos?: Photo[];
}

type Year = number;
type Month = number;
type Day = number;
type Ymd = [Year, Month, Day];
type PartialYmd =
  | [Year, Month, Day]
  | [Year | undefined, Month | undefined, Day | undefined];
type PartialYm = [Year, Month] | [Year | undefined, Month | undefined];

type PhotosByYmd = Record<string, Record<string, Record<string, Photo[]>>>;

const GalleryModel = (galleryData: unknown) => {
  const importGalleryData = (data: unknown): GalleryData | undefined => {
    if (!data || typeof data !== "object") {
      return undefined;
    }
    const d = data as Record<string, unknown>;
    if (!d.id) {
      return undefined;
    }
    const out = { ...d } as unknown as GalleryData;
    if (out.epoch && !(out.epoch instanceof Date)) {
      out.epoch = new Date(out.epoch);
    }
    if (out.hostname && typeof out.hostname === "string") {
      out.hostname = new RegExp(`^${out.hostname}$`);
    }
    return out;
  };
  const groupPhotosByYearMonthDay = (photos: Photo[]): PhotosByYmd => {
    const photosByDate: PhotosByYmd = {};
    photos.forEach((photo) => {
      const year = String(photo.year());
      const month = String(photo.month());
      const day = String(photo.day());
      const yearMap = (photosByDate[year] = photosByDate[year] || {});
      const monthMap = (yearMap[month] = yearMap[month] || {});
      const dayPhotos = (monthMap[day] = monthMap[day] || []);
      dayPhotos.push(photo);
    });
    return photosByDate;
  };

  const gallery = importGalleryData(galleryData);
  if (!gallery) {
    return undefined;
  }

  const photos: Photo[] = gallery.photos || [];
  const photosByYmd = groupPhotosByYearMonthDay(photos);

  const epochDate = (): Date | undefined =>
    gallery.epoch instanceof Date ? gallery.epoch : undefined;
  const hostnameRegex = (): RegExp | undefined =>
    gallery.hostname instanceof RegExp ? gallery.hostname : undefined;

  const self = {
    withPhotos: (photos: Photo[]) => {
      return GalleryModel({ ...(galleryData as object), photos });
    },
    id: (): string => gallery.id,
    // Plain (resolved) title — overlay map looked up against `lang`,
    // falls through to canonical when no overlay is set. Pass no
    // lang to get the canonical column verbatim (admin / API
    // contexts where the localized maps are surfaced separately).
    title: (lang?: string): string => {
      const overlay = lang ? gallery.titleLocalized?.[lang] : undefined;
      return (overlay && overlay.length > 0 ? overlay : gallery.title) || "";
    },
    // Breadcrumb-formatted title for date-scoped views: prefixes the
    // resolved title with `YYYY[-MM[-DD]]` (and `#<position>` when
    // both date + position are known). Empty `opts` returns the
    // bare title, equivalent to `title(lang)`.
    breadcrumb: (opts: {
      year?: number;
      month?: number;
      day?: number;
      position?: number;
      lang?: string;
    } = {}): string => {
      const { year, month, day, position, lang } = opts;
      const overlay = lang ? gallery.titleLocalized?.[lang] : undefined;
      const base = (overlay && overlay.length > 0 ? overlay : gallery.title) || "";
      const ymd = format.date({ year, month, day });
      if (!ymd) return base;
      if (position === undefined) return `${ymd} — ${base}`;
      return `#${position} — ${ymd} — ${base}`;
    },
    description: (lang?: string): string => {
      const overlay = lang ? gallery.descriptionLocalized?.[lang] : undefined;
      return (overlay && overlay.length > 0 ? overlay : gallery.description) || "";
    },
    defaultLanguage: (): string | null => gallery.defaultLanguage ?? null,
    hasIcon: (): boolean => !!gallery.icon,
    icon: (): string => gallery.icon || "",
    hasEpoch: (): boolean => !!epochDate(),
    epoch: (): Date | undefined => epochDate(),
    epochYmd: (): Ymd | undefined => {
      const e = epochDate();
      if (!e) {
        return undefined;
      }
      return [e.getFullYear(), e.getMonth() + 1, e.getDate()];
    },
    epochType: (): string | undefined => gallery.epochType,
    hasTheme: (): boolean => !!gallery.theme,
    theme: (): string | undefined => gallery.theme,
    hideMap: (): boolean => !!gallery.hideMap,
    matchesHostname: (hostname: string): boolean => {
      const regex = hostnameRegex();
      if (!regex) {
        return false;
      }
      return regex.test(hostname);
    },
    path: (year?: number, month?: number, day?: number): string => {
      const parts = ["", "g", gallery.id];
      const ymd = format.date({ year, month, day, separator: "/" });
      if (ymd) {
        parts.push(ymd);
      }
      return parts.join("/");
    },
    // Caller passes the gallery's calendar shape (see `useGalleryCalendar`)
    // — the gallery model itself no longer carries the photo array
    // that used to drive `firstDay`/`lastDay`/`includesPhotos`.
    // `photo` initialView falls back to the month-of-lastDay path
    // here; pinning to the specific last-photo URL would need an
    // extra fetch beyond /counts, and the gallery list rendering N
    // gallery cards shouldn't fan out N photo lookups.
    lastPath: (shape: {
      includesPhotos: () => boolean;
      lastDay: () => [number, number, number] | [undefined, undefined, undefined];
    }): string => {
      if (!shape.includesPhotos()) {
        return self.path();
      }
      const [year, month, day] = shape.lastDay();
      if (year === undefined || month === undefined || day === undefined) {
        return self.path();
      }
      const initialView = gallery.initialView || config.INITIAL_GALLERY_VIEW;
      switch (initialView) {
        case "year":
          return self.path(year);
        case "day":
          return self.path(year, month, day);
        case "photo":
        default:
        case "month":
          return self.path(year, month);
      }
    },
    statsPath: (): string => ["", "s", gallery.id].join("/"),
    includesPhotos: (): boolean => photos.length > 0,
    includesYear: (year: number): boolean =>
      !!photosByYmd && String(year) in photosByYmd,
    includesMonth: (year: number, month: number): boolean =>
      self.includesYear(year) && String(month) in photosByYmd[String(year)],
    includesDay: (year: number, month: number, day: number): boolean =>
      self.includesMonth(year, month) &&
      String(day) in photosByYmd[String(year)][String(month)],
    includesPhoto: (
      year: number,
      month: number,
      day: number,
      photo: Photo
    ): boolean => self.currentPhotoIndex(year, month, day, photo) >= 0,
    countPhotos: (year: number, month: number, day: number): number => {
      const y = String(year);
      const m = String(month);
      const d = String(day);
      if (
        !(y in photosByYmd) ||
        !(m in photosByYmd[y]) ||
        !(d in photosByYmd[y][m])
      ) {
        return 0;
      }
      return photosByYmd[y][m][d].length;
    },
    maxDayCount: (year?: number, month?: number): number => {
      if (month && year) {
        const y = String(year);
        const m = String(month);
        if (!(y in photosByYmd) || !(m in photosByYmd[y])) {
          return 0;
        }
        return Object.keys(photosByYmd[y][m])
          .map((day) => self.countPhotos(year, month, Number(day)))
          .reduce((a, b) => Math.max(a, b), 0);
      }
      if (year) {
        const y = String(year);
        if (!(y in photosByYmd)) {
          return 0;
        }
        return Object.keys(photosByYmd[y])
          .map((m) => self.maxDayCount(year, Number(m)))
          .reduce((a, b) => Math.max(a, b), 0);
      }
      return Object.keys(photosByYmd)
        .map((y) => self.maxDayCount(Number(y)))
        .reduce((a, b) => Math.max(a, b), 0);
    },
    photos: (year?: number, month?: number, day?: number): Photo[] => {
      if (!year && !month && !day) {
        return photos;
      }
      if (
        year === undefined ||
        month === undefined ||
        day === undefined ||
        !self.includesDay(year, month, day)
      ) {
        return [];
      }
      return photosByYmd[String(year)][String(month)][String(day)];
    },
    photo: (
      year: number,
      month: number,
      day: number,
      photoId: string
    ): Photo | undefined => {
      if (!self.includesDay(year, month, day)) {
        return undefined;
      }
      return photosByYmd[String(year)][String(month)][String(day)].find(
        (photo) => photo.id() === photoId
      );
    },
    mapYears: <T,>(f: (year: number) => T): T[] | undefined => {
      if (!self.includesPhotos()) {
        return undefined;
      }
      return Object.keys(photosByYmd).map(Number).map(f);
    },
    flatMapYears: <T,>(f: (year: number) => T[]): T[] => {
      if (!self.includesPhotos()) {
        return [];
      }
      return Object.keys(photosByYmd).map(Number).flatMap(f);
    },
    mapMonths: <T,>(
      year: number,
      f: (month: number) => T
    ): T[] | undefined => {
      if (!self.includesYear(year)) {
        return undefined;
      }
      return Object.keys(photosByYmd[String(year)]).map(Number).map(f);
    },
    flatMapMonths: <T,>(year: number, f: (month: number) => T[]): T[] => {
      if (!self.includesYear(year)) {
        return [];
      }
      return Object.keys(photosByYmd[String(year)]).map(Number).flatMap(f);
    },
    mapDays: <T,>(
      year: number,
      month: number,
      f: (day: number) => T
    ): T[] | undefined => {
      if (!self.includesMonth(year, month)) {
        return undefined;
      }
      return Object.keys(photosByYmd[String(year)][String(month)])
        .map(Number)
        .map(f);
    },
    flatMapDays: <T,>(
      year: number,
      month: number,
      f: (day: number) => T[]
    ): T[] => {
      if (!self.includesMonth(year, month)) {
        return [];
      }
      return Object.keys(photosByYmd[String(year)][String(month)])
        .map(Number)
        .flatMap(f);
    },

    firstYear: (): number | undefined => {
      if (!self.includesPhotos()) {
        return undefined;
      }
      return Math.min(...Object.keys(photosByYmd).map(Number));
    },
    firstMonth: (): PartialYm => {
      const year = self.firstYear();
      if (!year || !(String(year) in photosByYmd)) {
        return [undefined, undefined];
      }
      return [
        year,
        Math.min(...Object.keys(photosByYmd[String(year)]).map(Number)),
      ];
    },
    firstDay: (): PartialYmd => {
      const [year, month] = self.firstMonth();
      if (
        !year ||
        !month ||
        !(String(year) in photosByYmd) ||
        !(String(month) in photosByYmd[String(year)])
      ) {
        return [undefined, undefined, undefined];
      }
      return [
        year,
        month,
        Math.min(
          ...Object.keys(photosByYmd[String(year)][String(month)]).map(Number)
        ),
      ];
    },
    lastYear: (): number | undefined => {
      if (!self.includesPhotos()) {
        return undefined;
      }
      return Math.max(...Object.keys(photosByYmd).map(Number));
    },
    lastMonth: (): PartialYm => {
      const year = self.lastYear();
      if (!year || !(String(year) in photosByYmd)) {
        return [undefined, undefined];
      }
      return [
        year,
        Math.max(...Object.keys(photosByYmd[String(year)]).map(Number)),
      ];
    },
    lastDay: (): PartialYmd => {
      const [year, month] = self.lastMonth();
      if (
        !year ||
        !month ||
        !(String(year) in photosByYmd) ||
        !(String(month) in photosByYmd[String(year)])
      ) {
        return [undefined, undefined, undefined];
      }
      return [
        year,
        month,
        Math.max(
          ...Object.keys(photosByYmd[String(year)][String(month)]).map(Number)
        ),
      ];
    },

    isFirstYear: (currentYear: number): boolean =>
      collection.compareArrays([currentYear], [self.firstYear()]) === 0,
    isBeforeFirstYear: (currentYear: number): boolean =>
      (collection.compareArrays([currentYear], [self.firstYear()]) ?? 0) <= 0,
    isFirstMonth: (currentYear: number, currentMonth: number): boolean =>
      collection.compareArrays(
        [currentYear, currentMonth],
        self.firstMonth()
      ) === 0,
    isBeforeFirstMonth: (currentYear: number, currentMonth: number): boolean =>
      (collection.compareArrays(
        [currentYear, currentMonth],
        self.firstMonth()
      ) ?? 0) <= 0,
    isFirstDay: (
      currentYear: number,
      currentMonth: number,
      currentDay: number
    ): boolean =>
      collection.compareArrays(
        [currentYear, currentMonth, currentDay],
        self.firstDay()
      ) === 0,
    isBeforeFirstDay: (
      currentYear: number,
      currentMonth: number,
      currentDay: number
    ): boolean =>
      (collection.compareArrays(
        [currentYear, currentMonth, currentDay],
        self.firstDay()
      ) ?? 0) <= 0,
    isLastYear: (currentYear: number): boolean =>
      collection.compareArrays([currentYear], [self.lastYear()]) === 0,
    isAfterLasttYear: (currentYear: number): boolean =>
      (collection.compareArrays([currentYear], [self.lastYear()]) ?? 0) >= 0,
    isLastMonth: (currentYear: number, currentMonth: number): boolean =>
      collection.compareArrays(
        [currentYear, currentMonth],
        self.lastMonth()
      ) === 0,
    isAfterLastMonth: (currentYear: number, currentMonth: number): boolean =>
      (collection.compareArrays(
        [currentYear, currentMonth],
        self.lastMonth()
      ) ?? 0) >= 0,
    isLastDay: (
      currentYear: number,
      currentMonth: number,
      currentDay: number
    ): boolean =>
      collection.compareArrays(
        [currentYear, currentMonth, currentDay],
        self.lastDay()
      ) === 0,
    isAfterLastDay: (
      currentYear: number,
      currentMonth: number,
      currentDay: number
    ): boolean =>
      (collection.compareArrays(
        [currentYear, currentMonth, currentDay],
        self.lastDay()
      ) ?? 0) >= 0,

    previousYear: (currentYear: number): number | undefined => {
      if (!self.includesPhotos()) {
        return calendar.previousYear(currentYear);
      }
      if (self.isBeforeFirstYear(currentYear)) {
        return self.firstYear();
      }
      const previousYears = Object.keys(photosByYmd)
        .map(Number)
        .filter((year) => year < currentYear);
      return Math.max(...previousYears);
    },
    previousMonth: (
      currentYear: number,
      currentMonth: number
    ): PartialYm | [number, number] => {
      if (!self.includesPhotos()) {
        return calendar.previousMonth(currentYear, currentMonth);
      }
      if (self.isBeforeFirstMonth(currentYear, currentMonth)) {
        return self.firstMonth();
      }
      let year = currentYear;
      let month = currentMonth;
      do {
        [year, month] = calendar.previousMonth(year, month);
      } while (!self.includesMonth(year, month));
      return [year, month];
    },
    previousDay: (
      currentYear: number,
      currentMonth: number,
      currentDay: number
    ): PartialYmd | Ymd => {
      if (!self.includesPhotos()) {
        return calendar.previousDay(currentYear, currentMonth, currentDay);
      }
      if (self.isBeforeFirstDay(currentYear, currentMonth, currentDay)) {
        return self.firstDay();
      }
      let year = currentYear;
      let month = currentMonth;
      let day = currentDay;
      do {
        [year, month, day] = calendar.previousDay(year, month, day);
      } while (!self.includesDay(year, month, day));
      return [year, month, day];
    },
    nextYear: (currentYear: number): number | undefined => {
      if (!self.includesPhotos()) {
        return calendar.nextYear(currentYear);
      }
      if (self.isAfterLasttYear(currentYear)) {
        return self.lastYear();
      }
      const nextYears = Object.keys(photosByYmd)
        .map(Number)
        .filter((year) => year > currentYear);
      return Math.min(...nextYears);
    },
    nextMonth: (
      currentYear: number,
      currentMonth: number
    ): PartialYm | [number, number] => {
      if (!self.includesPhotos()) {
        return calendar.nextMonth(currentYear, currentMonth);
      }
      if (self.isAfterLastMonth(currentYear, currentMonth)) {
        return self.lastMonth();
      }
      let year = currentYear;
      let month = currentMonth;
      do {
        [year, month] = calendar.nextMonth(year, month);
      } while (!self.includesMonth(year, month));
      return [year, month];
    },
    nextDay: (
      currentYear: number,
      currentMonth: number,
      currentDay: number
    ): PartialYmd | Ymd => {
      if (!self.includesPhotos()) {
        return calendar.nextDay(currentYear, currentMonth, currentDay);
      }
      if (self.isAfterLastDay(currentYear, currentMonth, currentDay)) {
        return self.lastDay();
      }
      let year = currentYear;
      let month = currentMonth;
      let day = currentDay;
      do {
        [year, month, day] = calendar.nextDay(year, month, day);
      } while (!self.includesDay(year, month, day));
      return [year, month, day];
    },

    currentPhotoIndex: (
      year: number,
      month: number,
      day: number,
      currentPhoto: Photo
    ): number => {
      const y = String(year);
      const m = String(month);
      const d = String(day);
      if (
        !photosByYmd ||
        !(y in photosByYmd) ||
        !(m in photosByYmd[y]) ||
        !(d in photosByYmd[y][m]) ||
        !photosByYmd[y][m][d]
      ) {
        return -1;
      }
      const currentDayPhotos = photosByYmd[y][m][d];
      return currentDayPhotos.findIndex(
        (photo) => photo.id() === currentPhoto.id()
      );
    },
    firstPhoto: (): Photo | undefined => {
      const firstDayPhotos = self.photos(...self.firstDay());
      if (!firstDayPhotos.length) {
        return undefined;
      }
      return firstDayPhotos[0];
    },
    // Compare by id, not strict reference. The photo prop reaching the
    // caller may be a different object instance than firstPhoto() if the
    // gallery model rebuilds (filter change, refetch), even when both
    // represent the same logical photo. Reference inequality made the
    // Photo modal carousel render the current photo as its own "next"
    // slide on a swipe-left from the last photo.
    isFirstPhoto: (photo: Photo): boolean => {
      const first = self.firstPhoto();
      return !!first && photo.id() === first.id();
    },
    previousPhoto: (
      year: number,
      month: number,
      day: number,
      photo: Photo
    ): Photo => {
      const currentDayPhotos = self.photos(year, month, day);
      const currentIndex = self.currentPhotoIndex(year, month, day, photo);
      if (currentIndex > 0) {
        return currentDayPhotos[currentIndex - 1];
      }
      if (self.isFirstDay(year, month, day)) {
        return photo;
      }
      const previousDayPhotos = self.photos(
        ...self.previousDay(year, month, day)
      );
      if (!previousDayPhotos || previousDayPhotos.length === 0) {
        return photo;
      }
      return previousDayPhotos[previousDayPhotos.length - 1];
    },
    nextPhoto: (
      year: number,
      month: number,
      day: number,
      photo: Photo
    ): Photo => {
      const currentDayPhotos = self.photos(year, month, day);
      const currentIndex = self.currentPhotoIndex(year, month, day, photo);
      if (currentIndex < currentDayPhotos.length - 1) {
        return currentDayPhotos[currentIndex + 1];
      }
      if (self.isLastDay(year, month, day)) {
        return photo;
      }
      const nextDayPhotos = self.photos(...self.nextDay(year, month, day));
      if (!nextDayPhotos || nextDayPhotos.length === 0) {
        return photo;
      }
      return nextDayPhotos[0];
    },
    lastPhoto: (): Photo | undefined => {
      const lastDayPhotos = self.photos(...self.lastDay());
      if (!lastDayPhotos.length) {
        return undefined;
      }
      return lastDayPhotos[lastDayPhotos.length - 1];
    },
    isLastPhoto: (photo: Photo): boolean => {
      const last = self.lastPhoto();
      return !!last && photo.id() === last.id();
    },
  };
  return self;
};

export type Gallery = NonNullable<ReturnType<typeof GalleryModel>>;
export default GalleryModel;
