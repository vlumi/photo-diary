import calendar from "./calendar";

const G = (gallery) => {
  const photos = gallery.photos;
  const self = {
    getId: () => gallery.id,
    getTitle: () => gallery.title,
    getPath: (year, month, day, photo) => {
      const parts = ["", "g", gallery.id];
      const ymd = calendar.formatDate({ year, month, day, separator: "/" });
      if (ymd) {
        parts.push(ymd);
        if (photo) {
          parts.push(photo.id);
        }
      }
      return parts.join("/");
    },
    getPhotoPath: (photo) => {
      return self.getPath(
        photo.taken.instant.year,
        photo.taken.instant.month,
        photo.taken.instant.day,
        photo
      );
    },
    getLastPath: () => {
      const [year, month] = self.lastYearMonth();
      if (year && month) {
        return self.getPath(year, month);
      }
      return self.getPath(new Date().getFullYear());
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
    getPhotos: (year, month, day) => {
      if (!self.includesDay(year, month, day)) {
        return [];
      }
      return photos[year][month][day];
    },
    photos: photos,
    findPhoto: (year, month, day, photoId = "") => {
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
    firstYearMonth: () => {
      const year = self.firstYear();
      if (!year || !(year in gallery.photos)) {
        return [undefined, undefined];
      }
      return [year, Math.min(...Object.keys(gallery.photos[year]))];
    },
    firstYearMonthDay: () => {
      const [year, month] = self.firstYearMonth();
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
    lastYearMonth: () => {
      const year = self.lastYear();
      if (!year || !(year in gallery.photos)) {
        return [undefined, undefined];
      }
      return [year, Math.max(...Object.keys(gallery.photos[year]))];
    },
    lastYearMonthDay: () => {
      const [year, month] = self.lastYearMonth();
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
    isFirstYearMonth: (currentYear, currentMonth) => {
      const [year, month] = self.firstYearMonth();
      return (
        !year || !month || (currentYear === year && currentMonth === month)
      );
    },
    isFirstYearMonthDay: (currentYear, currentMonth, currentDay) => {
      const [year, month, day] = self.firstYearMonthDay();
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
    isLastYearMonth: (currentYear, currentMonth) => {
      const [year, month] = self.lastYearMonth();
      return (
        !year || !month || (currentYear === year && currentMonth === month)
      );
    },
    isLastYearMonthDay: (currentYear, currentMonth, currentDay) => {
      const [year, month, day] = self.lastYearMonthDay();
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
        return currentYear - 1;
      }
      return Math.max(...previousYears);
    },
    previousYearMonth: (currentYear, currentMonth) => {
      if (!("photos" in gallery)) {
        return undefined;
      }
      let year = currentYear;
      let month = currentMonth;
      while (!self.isFirstYearMonth(year, month)) {
        month--;
        if (month === 0) {
          month = 12;
          year--;
        }
        if (year in gallery.photos && month in gallery.photos[year]) {
          return [year, month];
        }
      }
      if (currentMonth > 1) {
        return [currentYear, currentMonth - 1];
      }
      return [currentYear - 1, 12];
    },
    previousYearMonthDay: (currentYear, currentMonth, currentDay) => {
      if (!("photos" in gallery)) {
        return undefined;
      }
      let year = currentYear;
      let month = currentMonth;
      let day = currentDay;
      while (!self.isFirstYearMonthDay(year, month)) {
        day--;
        if (day === 0) {
          month--;
          if (month === 0) {
            month = 12;
            year--;
          }
          day = calendar.getDaysInMonth(year, month);
        }
        if (
          year in gallery.photos &&
          month in gallery.photos[year] &&
          day in gallery.photos[year][month]
        ) {
          return [year, month, day];
        }
      }
      if (currentDay > 1) {
        return [currentYear, currentMonth, currentDay - 1];
      }
      if (currentMonth > 1) {
        return [
          currentYear,
          currentMonth - 1,
          calendar.getDaysInMonth(currentYear, currentMonth - 1),
        ];
      }
      return [
        currentYear - 1,
        12,
        calendar.getDaysInMonth(currentYear - 1, 11),
      ];
    },
    nextYear: (currentYear) => {
      if (!("photos" in gallery)) {
        return undefined;
      }
      const nextYears = Object.keys(gallery.photos).filter(
        (year) => year > currentYear
      );
      if (nextYears.length < 1) {
        return currentYear + 1;
      }
      return Math.min(...nextYears);
    },
    nextYearMonth: (currentYear, currentMonth) => {
      if (!("photos" in gallery)) {
        return undefined;
      }
      let year = currentYear;
      let month = currentMonth;
      while (!self.isLastYearMonth(year, month)) {
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
        if (year in gallery.photos && month in gallery.photos[year]) {
          return [year, month];
        }
      }
      if (currentMonth < 12) {
        return [currentYear, currentMonth + 1];
      }
      return [currentYear + 1, 1];
    },
    nextYearMonthDay: (currentYear, currentMonth, currentDay) => {
      if (!("photos" in gallery)) {
        return undefined;
      }
      let year = currentYear;
      let month = currentMonth;
      let day = currentDay;
      while (!self.isLastYearMonthDay(year, month, day)) {
        day++;
        if (day > calendar.getDaysInMonth(year, month)) {
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
      if (currentDay < calendar.getDaysInMonth(currentYear, currentMonth)) {
        return [currentYear, currentMonth, currentDay + 1];
      }
      if (currentMonth < 12) {
        return [currentYear, currentMonth + 1, 1];
      }
      return [currentYear + 1, 1, 1];
    },

    getCurrentPhotoIndex: (year, month, day, currentPhoto) => {
      const currentDayPhotos = gallery.photos[year][month][day];
      const currentIndex = currentDayPhotos.findIndex(
        (photo) => photo.id === currentPhoto.id
      );
      return currentIndex;
    },
    getPreviousPhoto: (year, month, day, photo) => {
      const currentDayPhotos = gallery.photos[year][month][day];
      const currentIndex = self.getCurrentPhotoIndex(year, month, day, photo);
      if (currentIndex > 0) {
        return currentDayPhotos[currentIndex - 1];
      }
      const [
        previousYear,
        previousMonth,
        previousDay,
      ] = self.previousYearMonthDay(year, month, day);
      if (!previousYear || !previousMonth || !previousDay) {
        return undefined;
      }
      const previousDayPhotos =
        gallery.photos[previousYear][previousMonth][previousDay];
      if (!previousDayPhotos || previousDayPhotos.length === 0) {
        return undefined;
      }
      return previousDayPhotos[previousDayPhotos.length - 1];
    },
    getNextPhoto: (year, month, day, photo) => {
      const currentDayPhotos = gallery.photos[year][month][day];
      const currentIndex = self.getCurrentPhotoIndex(year, month, day, photo);
      if (currentIndex < currentDayPhotos.length - 1) {
        return currentDayPhotos[currentIndex + 1];
      }
      const [nextYear, nextMonth, nextDay] = self.nextYearMonthDay(
        year,
        month,
        day
      );
      if (!nextYear || !nextMonth || !nextDay) {
        return undefined;
      }
      const nextDayPhotos = gallery.photos[nextYear][nextMonth][nextDay];
      if (!nextDayPhotos || nextDayPhotos.length === 0) {
        return undefined;
      }
      return nextDayPhotos[0];
    },
  };
  return self;
};

export default G;
