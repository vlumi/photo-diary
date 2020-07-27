import Photo from "./Photo";

import calendar from "../utils/calendar";
import collection from "../utils/collection";
import config from "../utils/config";

const Gallery = (galleryData) => {
  const importGalleryData = (galleryData) => {
    if (galleryData.epoch) {
      galleryData.epoch = new Date(galleryData.epoch);
    }
    if (galleryData.hostname) {
      galleryData.hostname = new RegExp(`^${galleryData.hostname}$`);
    }
    return galleryData;
  };
  const importPhotos = (photosByYmd) => {
    const photos = [];
    Object.keys(photosByYmd).forEach((year) => {
      Object.keys(photosByYmd[year]).forEach((month) => {
        Object.keys(photosByYmd[year][month]).forEach((day) => {
          photosByYmd[year][month][day] = photosByYmd[year][month][
            day
          ].map((photo) => Photo(photo));
          photos.push(...photosByYmd[year][month][day]);
        });
      });
    });
    return [photos, photosByYmd];
  };

  const gallery = importGalleryData(galleryData);
  const [photos, photosByYmd] = importPhotos(gallery.photos || {});
  const self = {
    id: () => gallery.id,
    isSpecial: () => gallery.id.startsWith(":"),
    title: (year, month, day, photo) => {
      const ymd = calendar.formatDate({ year, month, day });
      if (!ymd) {
        return gallery.title;
      }
      if (!photo) {
        return `${gallery.title} — ${ymd} `;
      }
      return `${gallery.title} — ${ymd} #${photo.index() + 1}`;
    },
    description: () => gallery.description || "",
    hasIcon: () => gallery && "icon" in gallery && gallery.icon,
    icon: () => gallery.icon || "",
    hasEpoch: () => gallery && "epoch" in gallery && gallery.epoch,
    epoch: () => gallery.epoch,
    epochYmd: () => {
      return [
        gallery.epoch.getFullYear(),
        gallery.epoch.getMonth() + 1,
        gallery.epoch.getDate(),
      ];
    },
    epochType: () => gallery.epochType,
    hasTheme: () => gallery && "theme" in gallery && gallery.theme,
    theme: () => gallery.theme,
    matchesHostname: (hostname) => {
      if (!gallery.hostname) {
        return false;
      }
      return gallery.hostname.test(hostname);
    },
    path: (year, month, day) => {
      const parts = ["", "g", gallery.id];
      const ymd = calendar.formatDate({ year, month, day, separator: "/" });
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
      if (!self.includesDay(year, month, day)) {
        return self.path(new Date());
      }
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
      "photos" in gallery && Object.keys(gallery.photos).length > 0,
    includesYear: (year) => year in photosByYmd,
    includesMonth: (year, month) =>
      self.includesYear(year) && month in photosByYmd[year],
    includesDay: (year, month, day) =>
      self.includesMonth(year, month) && day in photosByYmd[year][month],
    includesPhoto: (year, month, day, photo) =>
      self.currentPhotoIndex(year, month, day, photo) >= 0,
    countPhotos: (year, month, day) => {
      if (
        !photosByYmd ||
        !(year in photosByYmd) ||
        !(month in photosByYmd[year]) ||
        !(day in photosByYmd[year][month])
      ) {
        return 0;
      }
      return photosByYmd[year][month][day].length;
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
    photo: (year, month, day, photoId = "") => {
      if (!self.includesDay(year, month, day)) {
        return undefined;
      }
      return photosByYmd[year][month][day].find(
        (photo) => photo.id() === photoId
      );
    },
    mapYears: (f) => {
      return Object.keys(photosByYmd).map(Number).map(f);
    },
    flatMapYears: (f) => {
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
        return;
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
        return;
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
      return collection.compareArrays([currentYear], [self.firstYear()]) >= 0;
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
        ) >= 0
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
        ) >= 0
      );
    },
    isLastYear: (currentYear) => {
      return collection.compareArrays([currentYear], [self.lastYear()]) === 0;
    },
    isAfterLasttYear: (currentYear) => {
      return collection.compareArrays([currentYear], [self.lastYear()]) <= 0;
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
        ) <= 0
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
        ) <= 0
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
      if (previousYears.length > 0) {
        return Math.max(...previousYears);
      }
      return currentYear;
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
      while (!self.isFirstMonth(year, month)) {
        [year, month] = calendar.previousMonth(year, month);
        if (self.includesMonth(year, month)) {
          return [year, month];
        }
      }
      return [currentYear, currentMonth];
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
      while (!self.isFirstDay(year, month, day)) {
        [year, month, day] = calendar.previousDay(year, month, day);
        if (self.includesDay(year, month, day)) {
          return [year, month, day];
        }
      }
      return [currentYear, currentMonth, currentDay];
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
      if (nextYears.length > 0) {
        return Math.min(...nextYears);
      }
      return currentYear;
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
      while (!self.isLastMonth(year, month)) {
        [year, month] = calendar.nextMonth(year, month);
        if (self.includesMonth(year, month)) {
          return [year, month];
        }
      }
      return [currentYear, currentMonth];
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
      while (!self.isLastDay(year, month, day)) {
        [year, month, day] = calendar.nextDay(year, month, day);
        if (self.includesDay(year, month, day)) {
          return [year, month, day];
        }
      }
      return [currentYear, currentMonth, currentDay];
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
      if (firstDayPhotos.length > 0) {
        return firstDayPhotos[0];
      }
      return undefined;
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
      if (lastDayPhotos.length > 0) {
        return lastDayPhotos[lastDayPhotos.length - 1];
      }
      return undefined;
    },
    isLastPhoto: (photo) => photo === self.lastPhoto(),
  };
  return self;
};

export default Gallery;
