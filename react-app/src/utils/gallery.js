import calendar from "./calendar";

const G = (gallery) => {
  const photos = gallery.photos;
  const self = {
    id: () => gallery.id,
    title: () => gallery.title,
    path: (year, month, day, photo) => {
      const parts = ["", "g", gallery.id];
      const ymd = calendar.format({ year, month, day, separator: "/" });
      if (ymd) {
        parts.push(ymd);
        if (photo) {
          parts.push(photo.id);
        }
      }
      return parts.join("/");
    },
    photoPath: (photo) => {
      return self.path(
        photo.taken.instant.year,
        photo.taken.instant.month,
        photo.taken.instant.day,
        photo
      );
    },
    lastPath: () => {
      const [year, month] = self.lastMonth();
      if (year && month) {
        return self.path(year, month);
      }
      return self.path(new Date().getFullYear());
    },
    includesPhotos: () => "photos" in gallery,
    includesYear: (year) => self.includesPhotos() && year in photos,
    includesMonth: (year, month) =>
      self.includesYear(year) && month in photos[year],
    includesDay: (year, month, day) =>
      self.includesMonth(year, month) && day in photos[year][month],
    countPhotos: (year, month, day) => {
      if (
        !photos ||
        !(year in photos) ||
        !(month in photos[year]) ||
        !(day in photos[year][month])
      ) {
        return 0;
      }
      return photos[year][month][day].length;
    },
    photos: (year, month, day) => {
      if (!self.includesDay(year, month, day)) {
        return [];
      }
      return photos[year][month][day];
    },
    photo: (year, month, day, photoId = "") => {
      if (!self.includesDay(year, month, day)) {
        return undefined;
      }
      return photos[year][month][day].find((photo) => photo.id === photoId);
    },
    mapYears: (f) => {
      if (!self.includesPhotos()) {
        return;
      }
      return Object.keys(gallery.photos).map(f);
    },
    mapMonths: (year, f) => {
      if (!self.includesYear(year)) {
        return;
      }
      return Object.keys(gallery.photos[year]).map(f);
    },
    mapDays: (year, month, f) => {
      if (!self.includesMonth(year, month)) {
        return;
      }
      return Object.keys(gallery.photos[year][month]).map(f);
    },

    firstYear: () => {
      if (!("photos" in gallery)) {
        return undefined;
      }
      return Math.min(...Object.keys(gallery.photos));
    },
    firstMonth: () => {
      const year = self.firstYear();
      if (!year || !(year in gallery.photos)) {
        return [undefined, undefined];
      }
      return [year, Math.min(...Object.keys(gallery.photos[year]))];
    },
    firstDay: () => {
      const [year, month] = self.firstMonth();
      if (
        !year ||
        !month ||
        !(year in gallery.photos) ||
        !(month in gallery.photos[year])
      ) {
        return [undefined, undefined, undefined];
      }
      return [
        year,
        month,
        Math.min(...Object.keys(gallery.photos[year][month])),
      ];
    },
    lastYear: () => {
      if (!("photos" in gallery)) {
        return undefined;
      }
      return Math.max(...Object.keys(gallery.photos));
    },
    lastMonth: () => {
      const year = self.lastYear();
      if (!year || !(year in gallery.photos)) {
        return [undefined, undefined];
      }
      return [year, Math.max(...Object.keys(gallery.photos[year]))];
    },
    lastDay: () => {
      const [year, month] = self.lastMonth();
      if (
        !year ||
        !month ||
        !(year in gallery.photos) ||
        !(month in gallery.photos[year])
      ) {
        return [undefined, undefined, undefined];
      }
      return [
        year,
        month,
        Math.max(...Object.keys(gallery.photos[year][month])),
      ];
    },

    isFirstYear: (currentYear) => {
      const year = self.firstYear();
      return !year || currentYear === year;
    },
    isFirstMonth: (currentYear, currentMonth) => {
      const [year, month] = self.firstMonth();
      return (
        !year || !month || (currentYear === year && currentMonth === month)
      );
    },
    isFirstDay: (currentYear, currentMonth, currentDay) => {
      const [year, month, day] = self.firstDay();
      return (
        !year ||
        !month ||
        !day ||
        currentYear < year ||
        (currentYear === year &&
          (currentMonth < month ||
            (currentMonth === month && currentDay <= day)))
      );
    },
    isLastYear: (currentYear) => {
      const year = self.lastYear();
      return !year || currentYear === year;
    },
    isLastMonth: (currentYear, currentMonth) => {
      const [year, month] = self.lastMonth();
      return (
        !year || !month || (currentYear === year && currentMonth === month)
      );
    },
    isLastDay: (currentYear, currentMonth, currentDay) => {
      const [year, month, day] = self.lastDay();
      return (
        !year ||
        !month ||
        !day ||
        currentYear > year ||
        (currentYear === year &&
          (currentMonth > month ||
            (currentMonth === month && currentDay >= day)))
      );
    },

    previousYear: (currentYear) => {
      if (!("photos" in gallery)) {
        return undefined;
      }
      const previousYears = Object.keys(gallery.photos).filter(
        (year) => year < currentYear
      );
      if (previousYears.length === 0) {
        return currentYear;
      }
      return Math.max(...previousYears);
    },
    previousMonth: (currentYear, currentMonth) => {
      if (!("photos" in gallery)) {
        return undefined;
      }
      let year = currentYear;
      let month = currentMonth;
      while (!self.isFirstMonth(year, month)) {
        month--;
        if (month === 0) {
          month = 12;
          year--;
        }
        if (year in gallery.photos && month in gallery.photos[year]) {
          return [year, month];
        }
      }
      return [currentYear, currentMonth];
    },
    previousDay: (currentYear, currentMonth, currentDay) => {
      if (!("photos" in gallery)) {
        return undefined;
      }
      let year = currentYear;
      let month = currentMonth;
      let day = currentDay;
      while (!self.isFirstDay(year, month)) {
        day--;
        if (day === 0) {
          month--;
          if (month === 0) {
            month = 12;
            year--;
          }
          day = calendar.daysInMonth(year, month);
        }
        if (
          year in gallery.photos &&
          month in gallery.photos[year] &&
          day in gallery.photos[year][month]
        ) {
          return [year, month, day];
        }
      }
      return [currentYear, currentMonth, currentDay];
    },
    nextYear: (currentYear) => {
      if (!("photos" in gallery)) {
        return undefined;
      }
      const nextYears = Object.keys(gallery.photos).filter(
        (year) => year > currentYear
      );
      if (nextYears.length < 1) {
        return currentYear;
      }
      return Math.min(...nextYears);
    },
    nextMonth: (currentYear, currentMonth) => {
      if (!("photos" in gallery)) {
        return undefined;
      }
      let year = currentYear;
      let month = currentMonth;
      while (!self.isLastMonth(year, month)) {
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
        if (year in gallery.photos && month in gallery.photos[year]) {
          return [year, month];
        }
      }
      return [currentYear, currentMonth];
    },
    nextDay: (currentYear, currentMonth, currentDay) => {
      if (!("photos" in gallery)) {
        return undefined;
      }
      let year = currentYear;
      let month = currentMonth;
      let day = currentDay;
      while (!self.isLastDay(year, month, day)) {
        day++;
        if (day > calendar.daysInMonth(year, month)) {
          month++;
          if (month > 12) {
            month = 1;
            year++;
          }
          day = 1;
        }
        if (self.includesDay(year, month, day)) {
          return [year, month, day];
        }
      }
      return [currentYear, currentMonth, currentDay];
    },

    currentPhotoIndex: (year, month, day, currentPhoto) => {
      const currentDayPhotos = gallery.photos[year][month][day];
      const currentIndex = currentDayPhotos.findIndex(
        (photo) => photo.id === currentPhoto.id
      );
      return currentIndex;
    },
    firstPhoto: () => {
      const [firstYear, firstMonth, firstDay] = self.firstDay();
      const firstDayPhotos = self.photos(firstYear, firstMonth, firstDay);
      if (firstDayPhotos.length > 0) {
        return firstDayPhotos[0];
      }
      return undefined;
    },
    previousPhoto: (year, month, day, photo) => {
      const currentDayPhotos = gallery.photos[year][month][day];
      const currentIndex = self.currentPhotoIndex(year, month, day, photo);
      if (currentIndex > 0) {
        return currentDayPhotos[currentIndex - 1];
      }
      const [previousYear, previousMonth, previousDay] = self.previousDay(
        year,
        month,
        day
      );
      if (
        !previousYear ||
        !previousMonth ||
        !previousDay ||
        (previousYear === year &&
          previousMonth === month &&
          previousDay === day)
      ) {
        return photo;
      }
      const previousDayPhotos =
        gallery.photos[previousYear][previousMonth][previousDay];
      if (!previousDayPhotos || previousDayPhotos.length === 0) {
        return photo;
      }
      return previousDayPhotos[previousDayPhotos.length - 1];
    },
    nextPhoto: (year, month, day, photo) => {
      const currentDayPhotos = gallery.photos[year][month][day];
      const currentIndex = self.currentPhotoIndex(year, month, day, photo);
      if (currentIndex < currentDayPhotos.length - 1) {
        return currentDayPhotos[currentIndex + 1];
      }
      const [nextYear, nextMonth, nextDay] = self.nextDay(year, month, day);
      if (
        !nextYear ||
        !nextMonth ||
        !nextDay ||
        (nextYear === year && nextMonth === month && nextDay === day)
      ) {
        return photo;
      }
      const nextDayPhotos = gallery.photos[nextYear][nextMonth][nextDay];
      if (!nextDayPhotos || nextDayPhotos.length === 0) {
        return photo;
      }
      return nextDayPhotos[0];
    },
    lastPhoto: () => {
      const [lasstYear, lasstMonth, lastDay] = self.lastDay();
      const lastDayPhotos = self.photos(lasstYear, lasstMonth, lastDay);
      if (lastDayPhotos.length > 0) {
        return lastDayPhotos[lastDayPhotos.length - 1];
      }
      return undefined;
    },
  };
  return self;
};

export default G;
