import calendar from "../lib/calendar";
import format from "../lib/format";
import collection from "../lib/collection";
import config from "../lib/config";

const GalleryModel = (galleryData) => {
  const importGalleryData = (galleryData) => {
    // TODO: validate
    if (!galleryData || !galleryData.id) {
      return undefined;
    }
    if (galleryData.epoch) {
      galleryData.epoch = new Date(galleryData.epoch);
    }
    if (galleryData.hostname) {
      galleryData.hostname = new RegExp(`^${galleryData.hostname}$`);
    }
    return galleryData;
  };
  const groupPhotosByYearMonthDay = (photos) => {
    const photosByDate = {};
    photos.forEach((photo) => {
      const yearMap = (photosByDate[photo.year()] =
        photosByDate[photo.year()] || {});
      const monthMap = (yearMap[photo.month()] = yearMap[photo.month()] || {});
      const dayPhotos = (monthMap[photo.day()] = monthMap[photo.day()] || []);
      dayPhotos.push(photo);
    });
    return photosByDate;
  };
  const importPhotos = (photos) => {
    const photosByYmd = groupPhotosByYearMonthDay(photos);
    return [photos, photosByYmd];
  };

  const gallery = importGalleryData(galleryData);
  if (!gallery) {
    return undefined;
  }

  const [photos, photosByYmd] = importPhotos(gallery.photos || []);

  const self = {
    withPhotos: (photos) => {
      return GalleryModel({ ...galleryData, photos });
    },
    id: () => gallery.id,
    isSpecial: () => gallery.id.startsWith(":"),
    title: (year, month, day, photo) => {
      const ymd = format.date({ year, month, day });
      if (!ymd) {
        return gallery.title || "";
      }
      if (!photo) {
        return `${ymd} — ${gallery.title || ""}`;
      }
      return `#${photo.index() + 1} — ${ymd} — ${gallery.title || ""}`;
    },
    description: () => gallery.description || "",
    hasIcon: () => !!("icon" in gallery && gallery.icon),
    icon: () => gallery.icon || "",
    hasEpoch: () => !!("epoch" in gallery && gallery.epoch),
    epoch: () => gallery.epoch,
    epochYmd: () => {
      if (!gallery.epoch) {
        return undefined;
      }
      return [
        gallery.epoch.getFullYear(),
        gallery.epoch.getMonth() + 1,
        gallery.epoch.getDate(),
      ];
    },
    epochType: () => gallery.epochType,
    hasTheme: () => !!(gallery && "theme" in gallery && gallery.theme),
    theme: () => gallery.theme,
    matchesHostname: (hostname) => {
      if (!gallery.hostname) {
        return false;
      }
      return gallery.hostname.test(hostname);
    },
    path: (year, month, day) => {
      const parts = ["", "g", gallery.id];
      const ymd = format.date({ year, month, day, separator: "/" });
      if (ymd) {
        parts.push(ymd);
      }
      return parts.join("/");
    },
    lastPath: () => {
      if (!self.includesPhotos()) {
        return self.path();
      }
      const [year, month, day] = self.lastDay();
      const initialView = gallery.initialView || config.INITIAL_GALLERY_VIEW;
      switch (initialView) {
        case "year":
          return self.path(year);
        default:
        case "month":
          return self.path(year, month);
        case "day":
          return self.path(year, month, day);
        case "photo":
          return self.lastPhoto().path(self);
      }
    },
    statsPath: () => ["", "g", gallery.id, "stats"].join("/"),
    includesPhotos: () =>
      !!("photos" in gallery && Object.keys(gallery.photos).length > 0),
    includesYear: (year) => photosByYmd && year in photosByYmd,
    includesMonth: (year, month) =>
      self.includesYear(year) && month in photosByYmd[year],
    includesDay: (year, month, day) =>
      self.includesMonth(year, month) && day in photosByYmd[year][month],
    includesPhoto: (year, month, day, photo) =>
      self.currentPhotoIndex(year, month, day, photo) >= 0,
    countPhotos: (year, month, day) => {
      if (
        !(year in photosByYmd) ||
        !(month in photosByYmd[year]) ||
        !(day in photosByYmd[year][month])
      ) {
        return 0;
      }
      return photosByYmd[year][month][day].length;
    },
    maxDayCount: (year, month) => {
      if (month) {
        if (!(year in photosByYmd) || !(month in photosByYmd[year])) {
          return 0;
        }
        return Object.keys(photosByYmd[year][month])
          .map((day) => self.countPhotos(year, month, day))
          .reduce((a, b) => Math.max(a, b), 0);
      }
      if (year) {
        if (!(year in photosByYmd)) {
          return 0;
        }
        return Object.keys(photosByYmd[year])
          .map((month) => self.maxDayCount(year, month))
          .reduce((a, b) => Math.max(a, b), 0);
      }
      return Object.keys(photosByYmd)
        .map((year) => self.maxDayCount(year))
        .reduce((a, b) => Math.max(a, b), 0);
    },
    photos: (year, month, day) => {
      if (!year && !month && !day) {
        return photos;
      }
      if (!self.includesDay(year, month, day)) {
        return [];
      }
      return photosByYmd[year][month][day];
    },
    photo: (year, month, day, photoId) => {
      if (!self.includesDay(year, month, day)) {
        return undefined;
      }
      return photosByYmd[year][month][day].find(
        (photo) => photo.id() === photoId
      );
    },
    mapYears: (f) => {
      if (!self.includesPhotos()) {
        return;
      }
      return Object.keys(photosByYmd).map(Number).map(f);
    },
    flatMapYears: (f) => {
      if (!self.includesPhotos()) {
        return [];
      }
      return Object.keys(photosByYmd).map(Number).flatMap(f);
    },
    mapMonths: (year, f) => {
      if (!self.includesYear(year)) {
        return;
      }
      return Object.keys(photosByYmd[year]).map(Number).map(f);
    },
    flatMapMonths: (year, f) => {
      if (!self.includesYear(year)) {
        return [];
      }
      return Object.keys(photosByYmd[year]).map(Number).flatMap(f);
    },
    mapDays: (year, month, f) => {
      if (!self.includesMonth(year, month)) {
        return;
      }
      return Object.keys(photosByYmd[year][month]).map(Number).map(f);
    },
    flatMapDays: (year, month, f) => {
      if (!self.includesMonth(year, month)) {
        return [];
      }
      return Object.keys(photosByYmd[year][month]).map(Number).flatMap(f);
    },

    firstYear: () => {
      if (!self.includesPhotos()) {
        return undefined;
      }
      return Math.min(...Object.keys(photosByYmd));
    },
    firstMonth: () => {
      const year = self.firstYear();
      if (!year || !(year in photosByYmd)) {
        return [undefined, undefined];
      }
      return [year, Math.min(...Object.keys(photosByYmd[year]))];
    },
    firstDay: () => {
      const [year, month] = self.firstMonth();
      if (
        !year ||
        !month ||
        !(year in photosByYmd) ||
        !(month in photosByYmd[year])
      ) {
        return [undefined, undefined, undefined];
      }
      return [year, month, Math.min(...Object.keys(photosByYmd[year][month]))];
    },
    lastYear: () => {
      if (!self.includesPhotos()) {
        return undefined;
      }
      return Math.max(...Object.keys(photosByYmd));
    },
    lastMonth: () => {
      const year = self.lastYear();
      if (!year || !(year in photosByYmd)) {
        return [undefined, undefined];
      }
      return [year, Math.max(...Object.keys(photosByYmd[year]))];
    },
    lastDay: () => {
      const [year, month] = self.lastMonth();
      if (
        !year ||
        !month ||
        !(year in photosByYmd) ||
        !(month in photosByYmd[year])
      ) {
        return [undefined, undefined, undefined];
      }
      return [year, month, Math.max(...Object.keys(photosByYmd[year][month]))];
    },

    isFirstYear: (currentYear) => {
      return collection.compareArrays([currentYear], [self.firstYear()]) === 0;
    },
    isBeforeFirstYear: (currentYear) => {
      return collection.compareArrays([currentYear], [self.firstYear()]) <= 0;
    },
    isFirstMonth: (currentYear, currentMonth) => {
      return (
        collection.compareArrays(
          [currentYear, currentMonth],
          self.firstMonth()
        ) === 0
      );
    },
    isBeforeFirstMonth: (currentYear, currentMonth) => {
      return (
        collection.compareArrays(
          [currentYear, currentMonth],
          self.firstMonth()
        ) <= 0
      );
    },
    isFirstDay: (currentYear, currentMonth, currentDay) => {
      return (
        collection.compareArrays(
          [currentYear, currentMonth, currentDay],
          self.firstDay()
        ) === 0
      );
    },
    isBeforeFirstDay: (currentYear, currentMonth, currentDay) => {
      return (
        collection.compareArrays(
          [currentYear, currentMonth, currentDay],
          self.firstDay()
        ) <= 0
      );
    },
    isLastYear: (currentYear) => {
      return collection.compareArrays([currentYear], [self.lastYear()]) === 0;
    },
    isAfterLasttYear: (currentYear) => {
      return collection.compareArrays([currentYear], [self.lastYear()]) >= 0;
    },
    isLastMonth: (currentYear, currentMonth) => {
      return (
        collection.compareArrays(
          [currentYear, currentMonth],
          self.lastMonth()
        ) === 0
      );
    },
    isAfterLastMonth: (currentYear, currentMonth) => {
      return (
        collection.compareArrays(
          [currentYear, currentMonth],
          self.lastMonth()
        ) >= 0
      );
    },
    isLastDay: (currentYear, currentMonth, currentDay) => {
      return (
        collection.compareArrays(
          [currentYear, currentMonth, currentDay],
          self.lastDay()
        ) === 0
      );
    },
    isAfterLastDay: (currentYear, currentMonth, currentDay) => {
      return (
        collection.compareArrays(
          [currentYear, currentMonth, currentDay],
          self.lastDay()
        ) >= 0
      );
    },

    previousYear: (currentYear) => {
      if (!self.includesPhotos()) {
        return calendar.previousYear(currentYear);
      }
      if (self.isBeforeFirstYear(currentYear)) {
        return self.firstYear();
      }
      const previousYears = Object.keys(photosByYmd).filter(
        (year) => year < currentYear
      );
      return Math.max(...previousYears);
    },
    previousMonth: (currentYear, currentMonth) => {
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
    previousDay: (currentYear, currentMonth, currentDay) => {
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
    nextYear: (currentYear) => {
      if (!self.includesPhotos()) {
        return calendar.nextYear(currentYear);
      }
      if (self.isAfterLasttYear(currentYear)) {
        return self.lastYear();
      }
      const nextYears = Object.keys(photosByYmd).filter(
        (year) => year > currentYear
      );
      return Math.min(...nextYears);
    },
    nextMonth: (currentYear, currentMonth) => {
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
    nextDay: (currentYear, currentMonth, currentDay) => {
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

    currentPhotoIndex: (year, month, day, currentPhoto) => {
      if (
        !photosByYmd ||
        !(year in photosByYmd) ||
        !(month in photosByYmd[year]) ||
        !(day in photosByYmd[year][month]) ||
        !photosByYmd[year][month][day]
      ) {
        return -1;
      }
      const currentDayPhotos = photosByYmd[year][month][day];
      const currentIndex = currentDayPhotos.findIndex(
        (photo) => photo.id() === currentPhoto.id()
      );
      return currentIndex;
    },
    firstPhoto: () => {
      const firstDayPhotos = self.photos(...self.firstDay());
      if (!firstDayPhotos.length) {
        return undefined;
      }
      return firstDayPhotos[0];
    },
    isFirstPhoto: (photo) => photo === self.firstPhoto(),
    previousPhoto: (year, month, day, photo) => {
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
    nextPhoto: (year, month, day, photo) => {
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
    lastPhoto: () => {
      const lastDayPhotos = self.photos(...self.lastDay());
      if (!lastDayPhotos.length) {
        return undefined;
      }
      return lastDayPhotos[lastDayPhotos.length - 1];
    },
    isLastPhoto: (photo) => photo === self.lastPhoto(),
  };
  return self;
};

export default GalleryModel;
