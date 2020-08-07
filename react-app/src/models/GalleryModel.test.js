import GalleryModel from "./GalleryModel";
import PhotoModel from "./PhotoModel";

let samples;
beforeAll(() => {
  samples = {
    empty: GalleryModel({
      id: "empty",
      title: undefined,
      description: undefined,
      icon: undefined,
      theme: undefined,
      epoch: undefined,
      epochType: undefined,
      hostname: undefined,
      initialView: undefined,
    }),
    testing: GalleryModel({
      id: "testing",
      title: "gallery testing",
      description: "testing gallery description",
      icon: "icon.jpg",
      theme: "blue",
      epoch: "2020-02-04",
      epochType: "birthday",
      hostname: "^gallery.*",
      initialView: "month",
    }),
    ":all": GalleryModel({
      id: ":all",
      title: "all photos",
      description: "all photos description",
      icon: undefined,
      theme: "red",
      epoch: undefined,
      epochType: undefined,
      hostname: undefined,
      initialView: "year",
    }),
    ":public": GalleryModel({
      id: ":all",
      title: "all photos",
      description: "all photos description",
      icon: undefined,
      theme: "red",
      epoch: undefined,
      epochType: undefined,
      hostname: undefined,
      initialView: "photo",
    }),
    daily: GalleryModel({
      id: ":all",
      title: "all photos",
      description: "all photos description",
      icon: undefined,
      theme: "red",
      epoch: undefined,
      epochType: undefined,
      hostname: undefined,
      initialView: "day",
    }),
    badInitial: GalleryModel({
      id: ":all",
      title: "all photos",
      description: "all photos description",
      icon: undefined,
      theme: "red",
      epoch: undefined,
      epochType: undefined,
      hostname: undefined,
      initialView: "foo",
    }),
  };
});
describe("Constructor", () => {
  let template;
  beforeEach(
    () =>
      (template = {
        id: "testing",
        title: "gallery testing",
        description: "testing gallery description",
        icon: "icon.jpg",
        theme: "blue",
        epoch: "2020-02-04",
        epochType: "birthday",
        hostname: "^gallery.*",
        initialView: ":public",
      })
  );
  test("Undefined", () => expect(GalleryModel(undefined)).toBeUndefined());
  test("No ID", () => {
    delete template.id;
    expect(GalleryModel(template)).toBeUndefined();
  });
});
describe("Without photos", () => {
  describe("id", () => {
    test("empty", () => expect(samples.empty.id()).toBe("empty"));
    test("testing", () => expect(samples.testing.id()).toBe("testing"));
    test(":all", () => expect(samples[":all"].id()).toBe(":all"));
  });
  describe("isSpecial", () => {
    test("empty", () => expect(samples.empty.isSpecial()).toBe(false));
    test("testing", () => expect(samples.testing.isSpecial()).toBe(false));
    test(":all", () => expect(samples[":all"].isSpecial()).toBe(true));
  });
  describe("title", () => {
    test("empty", () => expect(samples.empty.title()).toBe(""));
    test("testing", () =>
      expect(samples.testing.title()).toBe("gallery testing"));
    test(":all", () => expect(samples[":all"].title()).toBe("all photos"));
  });
  describe("title(year)", () => {
    test("empty", () => expect(samples.empty.title(2020)).toBe("2020 — "));
    test("testing", () =>
      expect(samples.testing.title(2020)).toBe("2020 — gallery testing"));
    test(":all", () =>
      expect(samples[":all"].title(2020)).toBe("2020 — all photos"));
  });
  describe("title(year, month)", () => {
    test("empty", () =>
      expect(samples.empty.title(2020, 5)).toBe("2020-05 — "));
    test("testing", () =>
      expect(samples.testing.title(2020, 5)).toBe("2020-05 — gallery testing"));
    test(":all", () =>
      expect(samples[":all"].title(2020, 5)).toBe("2020-05 — all photos"));
  });
  describe("title(year, month, day)", () => {
    test("empty", () =>
      expect(samples.empty.title(2020, 5, 27)).toBe("2020-05-27 — "));
    test("testing", () =>
      expect(samples.testing.title(2020, 5, 27)).toBe(
        "2020-05-27 — gallery testing"
      ));
    test(":all", () =>
      expect(samples[":all"].title(2020, 5, 27)).toBe(
        "2020-05-27 — all photos"
      ));
  });
  describe("description", () => {
    test("empty", () => expect(samples.empty.description()).toBe(""));
    test("testing", () =>
      expect(samples.testing.description()).toBe(
        "testing gallery description"
      ));
    test(":all", () =>
      expect(samples[":all"].description()).toBe("all photos description"));
  });
  describe("hasIcon", () => {
    test("empty", () => expect(samples.empty.hasIcon()).toBe(false));
    test("testing", () => expect(samples.testing.hasIcon()).toBe(true));
    test(":all", () => expect(samples[":all"].hasIcon()).toBe(false));
  });
  describe("icon", () => {
    test("empty", () => expect(samples.empty.icon()).toBe(""));
    test("testing", () => expect(samples.testing.icon()).toBe("icon.jpg"));
    test(":all", () => expect(samples[":all"].icon()).toBe(""));
  });
  describe("hasEpoch", () => {
    test("empty", () => expect(samples.empty.hasEpoch()).toBe(false));
    test("testing", () => expect(samples.testing.hasEpoch()).toBe(true));
    test(":all", () => expect(samples[":all"].hasEpoch()).toBe(false));
  });
  describe("epoch", () => {
    test("empty", () => expect(samples.empty.epoch()).toBeUndefined());
    test("testing", () =>
      expect(samples.testing.epoch().toISOString()).toBe(
        "2020-02-04T00:00:00.000Z"
      ));
    test(":all", () => expect(samples[":all"].epoch()).toBeUndefined());
  });
  describe("epochYmd", () => {
    test("empty", () => expect(samples.empty.epochYmd()).toBeUndefined());
    test("testing", () =>
      expect(samples.testing.epochYmd()).toStrictEqual([2020, 2, 4]));
    test(":all", () => expect(samples[":all"].epochYmd()).toBeUndefined());
  });
  describe("epochType", () => {
    test("empty", () => expect(samples.empty.epochType()).toBeUndefined());
    test("testing", () => expect(samples.testing.epochType()).toBe("birthday"));
    test(":all", () => expect(samples[":all"].epochType()).toBeUndefined());
  });
  describe("hasTheme", () => {
    test("empty", () => expect(samples.empty.hasTheme()).toBe(false));
    test("testing", () => expect(samples.testing.hasTheme()).toBe(true));
    test(":all", () => expect(samples[":all"].hasTheme()).toBe(true));
  });
  describe("theme", () => {
    test("empty", () => expect(samples.empty.theme()).toBeUndefined());
    test("testing", () => expect(samples.testing.theme()).toBe("blue"));
    test(":all", () => expect(samples[":all"].theme()).toBe("red"));
  });
  describe("matchesHostname gallery.example.com", () => {
    test("empty", () =>
      expect(samples.empty.matchesHostname("gallery.example.com")).toBe(false));
    test("testing", () =>
      expect(samples.testing.matchesHostname("gallery.example.com")).toBe(
        true
      ));
    test(":all", () =>
      expect(samples[":all"].matchesHostname("gallery.example.com")).toBe(
        false
      ));
  });
  describe("matchesHostname unknown.example.com", () => {
    test("empty", () =>
      expect(samples.empty.matchesHostname("unknown.example.com")).toBe(false));
    test("testing", () =>
      expect(samples.testing.matchesHostname("unknown.example.com")).toBe(
        false
      ));
    test(":all", () =>
      expect(samples[":all"].matchesHostname("unknown.example.com")).toBe(
        false
      ));
  });
  describe("path", () => {
    test("empty", () => expect(samples.empty.path()).toBe("/g/empty"));
    test("testing", () => expect(samples.testing.path()).toBe("/g/testing"));
    test(":all", () => expect(samples[":all"].path()).toBe("/g/:all"));
  });
  describe("path(year)", () => {
    test("empty", () => expect(samples.empty.path(2020)).toBe("/g/empty/2020"));
    test("testing", () =>
      expect(samples.testing.path(2020)).toBe("/g/testing/2020"));
    test(":all", () => expect(samples[":all"].path(2020)).toBe("/g/:all/2020"));
  });
  describe("path(year, month)", () => {
    test("empty", () =>
      expect(samples.empty.path(2020, 5)).toBe("/g/empty/2020/05"));
    test("testing", () =>
      expect(samples.testing.path(2020, 5)).toBe("/g/testing/2020/05"));
    test(":all", () =>
      expect(samples[":all"].path(2020, 5)).toBe("/g/:all/2020/05"));
  });
  describe("path(year, month, day)", () => {
    test("empty", () =>
      expect(samples.empty.path(2020, 5, 27)).toBe("/g/empty/2020/05/27"));
    test("testing", () =>
      expect(samples.testing.path(2020, 5, 27)).toBe("/g/testing/2020/05/27"));
    test(":all", () =>
      expect(samples[":all"].path(2020, 5, 27)).toBe("/g/:all/2020/05/27"));
  });
  describe("lastPath", () => {
    test("empty", () => expect(samples.empty.lastPath()).toBe("/g/empty"));
    test("testing", () =>
      expect(samples.testing.lastPath()).toBe("/g/testing"));
    test(":all", () => expect(samples[":all"].lastPath()).toBe("/g/:all"));
  });
  describe("statsPath", () => {
    test("empty", () =>
      expect(samples.empty.statsPath()).toBe("/g/empty/stats"));
    test("testing", () =>
      expect(samples.testing.statsPath()).toBe("/g/testing/stats"));
    test(":all", () =>
      expect(samples[":all"].statsPath()).toBe("/g/:all/stats"));
  });
  describe("includesPhotos", () => {
    test("empty", () => expect(samples.empty.includesPhotos()).toBe(false));
    test("testing", () => expect(samples.testing.includesPhotos()).toBe(false));
    test(":all", () => expect(samples[":all"].includesPhotos()).toBe(false));
  });
  describe("includesYear", () => {
    test("empty", () => expect(samples.empty.includesYear(2020)).toBe(false));
    test("testing", () =>
      expect(samples.testing.includesYear(2020)).toBe(false));
    test(":all", () => expect(samples[":all"].includesYear(2020)).toBe(false));
  });
  describe("includesMonth", () => {
    test("empty", () =>
      expect(samples.empty.includesMonth(2020, 5)).toBe(false));
    test("testing", () =>
      expect(samples.testing.includesMonth(2020, 5)).toBe(false));
    test(":all", () =>
      expect(samples[":all"].includesMonth(2020, 5)).toBe(false));
  });
  describe("includesDay", () => {
    test("empty", () =>
      expect(samples.empty.includesDay(2020, 5, 27)).toBe(false));
    test("testing", () =>
      expect(samples.testing.includesDay(2020, 5, 27)).toBe(false));
    test(":all", () =>
      expect(samples[":all"].includesDay(2020, 5, 27)).toBe(false));
  });
  describe("includesPhoto", () => {
    test("empty", () =>
      expect(samples.empty.includesPhoto(2020, 5, 27, {})).toBe(false));
    test("testing", () =>
      expect(samples.testing.includesPhoto(2020, 5, 27, {})).toBe(false));
    test(":all", () =>
      expect(samples[":all"].includesPhoto(2020, 5, 27, {})).toBe(false));
  });
  describe("countPhotos", () => {
    test("empty", () => expect(samples.empty.countPhotos(2020, 5, 27)).toBe(0));
    test("testing", () =>
      expect(samples.testing.countPhotos(2020, 5, 27)).toBe(0));
    test(":all", () =>
      expect(samples[":all"].countPhotos(2020, 5, 27)).toBe(0));
  });
  describe("maxDayCount", () => {
    test("empty 2020-05-27", () =>
      expect(samples.empty.maxDayCount(2020, 5, 27)).toBe(0));
    test("empty 2020-05", () =>
      expect(samples.empty.maxDayCount(2020, 5)).toBe(0));
    test("empty 2020", () => expect(samples.empty.maxDayCount(2020)).toBe(0));
    test("empty", () => expect(samples.empty.maxDayCount()).toBe(0));
  });
  describe("photos", () => {
    test("empty", () => expect(samples.empty.photos()).toStrictEqual([]));
    test("testing", () => expect(samples.testing.photos()).toStrictEqual([]));
    test(":all", () => expect(samples[":all"].photos()).toStrictEqual([]));
  });
  describe("photos(year, month, day)", () => {
    test("empty", () =>
      expect(samples.empty.photos(2020, 5, 27)).toStrictEqual([]));
    test("testing", () =>
      expect(samples.testing.photos(2020, 5, 27)).toStrictEqual([]));
    test(":all", () =>
      expect(samples[":all"].photos(2020, 5, 27)).toStrictEqual([]));
  });
  describe("photo", () => {
    test("empty", () =>
      expect(samples.empty.photo(2020, 5, 27, "1.jpg")).toBeUndefined());
    test("testing", () =>
      expect(samples.testing.photo(2020, 5, 27, "1.jpg")).toBeUndefined());
    test(":all", () =>
      expect(samples[":all"].photo(2020, 5, 27, "1.jpg")).toBeUndefined());
  });
  describe("Mappers", () => {
    let mock;
    beforeEach(() => {
      mock = jest.fn();
    });
    describe("mapYears", () => {
      test("empty", () => {
        expect(samples.empty.mapYears(mock)).toBeUndefined();
        expect(mock).not.toHaveBeenCalled();
      });
      test("testing", () => {
        expect(samples.testing.mapYears(mock)).toBeUndefined();
        expect(mock).not.toHaveBeenCalled();
      });
      test(":all", () => {
        expect(samples[":all"].mapYears(mock)).toBeUndefined();
        expect(mock).not.toHaveBeenCalled();
      });
    });
    describe("flatMapYears", () => {
      test("empty", () => {
        expect(samples.empty.flatMapYears(mock)).toStrictEqual([]);
        expect(mock).not.toHaveBeenCalled();
      });
      test("testing", () => {
        expect(samples.testing.flatMapYears(mock)).toStrictEqual([]);
        expect(mock).not.toHaveBeenCalled();
      });
      test(":all", () => {
        expect(samples[":all"].flatMapYears(mock)).toStrictEqual([]);
        expect(mock).not.toHaveBeenCalled();
      });
    });
    describe("mapMonths", () => {
      test("empty", () => {
        expect(samples.empty.mapMonths(mock)).toBeUndefined();
        expect(mock).not.toHaveBeenCalled();
      });
      test("testing", () => {
        expect(samples.testing.mapMonths(mock)).toBeUndefined();
        expect(mock).not.toHaveBeenCalled();
      });
      test(":all", () => {
        expect(samples[":all"].mapMonths(mock)).toBeUndefined();
        expect(mock).not.toHaveBeenCalled();
      });
    });
    describe("flatMapMonths", () => {
      test("empty", () => {
        expect(samples.empty.flatMapMonths(mock)).toStrictEqual([]);
        expect(mock).not.toHaveBeenCalled();
      });
      test("testing", () => {
        expect(samples.testing.flatMapMonths(mock)).toStrictEqual([]);
        expect(mock).not.toHaveBeenCalled();
      });
      test(":all", () => {
        expect(samples[":all"].flatMapMonths(mock)).toStrictEqual([]);
        expect(mock).not.toHaveBeenCalled();
      });
    });
    describe("mapDays", () => {
      test("empty", () => {
        expect(samples.empty.mapDays(mock)).toBeUndefined();
        expect(mock).not.toHaveBeenCalled();
      });
      test("testing", () => {
        expect(samples.testing.mapDays(mock)).toBeUndefined();
        expect(mock).not.toHaveBeenCalled();
      });
      test(":all", () => {
        expect(samples[":all"].mapDays(mock)).toBeUndefined();
        expect(mock).not.toHaveBeenCalled();
      });
    });
    describe("flatMapDays", () => {
      test("empty", () => {
        expect(samples.empty.flatMapDays(mock)).toStrictEqual([]);
        expect(mock).not.toHaveBeenCalled();
      });
      test("testing", () => {
        expect(samples.testing.flatMapDays(mock)).toStrictEqual([]);
        expect(mock).not.toHaveBeenCalled();
      });
      test(":all", () => {
        expect(samples[":all"].flatMapDays(mock)).toStrictEqual([]);
        expect(mock).not.toHaveBeenCalled();
      });
    });
  });
  describe("firstYear", () => {
    test("empty", () => expect(samples.empty.firstYear()).toBeUndefined());
    test("testing", () => expect(samples.testing.firstYear()).toBeUndefined());
    test(":all", () => expect(samples[":all"].firstYear()).toBeUndefined());
  });
  describe("firstMonth", () => {
    test("empty", () =>
      expect(samples.empty.firstMonth()).toStrictEqual([undefined, undefined]));
    test("testing", () =>
      expect(samples.testing.firstMonth()).toStrictEqual([
        undefined,
        undefined,
      ]));
    test(":all", () =>
      expect(samples[":all"].firstMonth()).toStrictEqual([
        undefined,
        undefined,
      ]));
  });
  describe("firstDay", () => {
    test("empty", () =>
      expect(samples.empty.firstDay()).toStrictEqual([
        undefined,
        undefined,
        undefined,
      ]));
    test("testing", () =>
      expect(samples.testing.firstDay()).toStrictEqual([
        undefined,
        undefined,
        undefined,
      ]));
    test(":all", () =>
      expect(samples[":all"].firstDay()).toStrictEqual([
        undefined,
        undefined,
        undefined,
      ]));
  });
  describe("lastYear", () => {
    test("empty", () => expect(samples.empty.lastYear()).toBeUndefined());
    test("testing", () => expect(samples.testing.lastYear()).toBeUndefined());
    test(":all", () => expect(samples[":all"].lastYear()).toBeUndefined());
  });
  describe("lastMonth", () => {
    test("empty", () =>
      expect(samples.empty.lastMonth()).toStrictEqual([undefined, undefined]));
    test("testing", () =>
      expect(samples.testing.lastMonth()).toStrictEqual([
        undefined,
        undefined,
      ]));
    test(":all", () =>
      expect(samples[":all"].lastMonth()).toStrictEqual([
        undefined,
        undefined,
      ]));
  });
  describe("lastDay", () => {
    test("empty", () =>
      expect(samples.empty.lastDay()).toStrictEqual([
        undefined,
        undefined,
        undefined,
      ]));
    test("testing", () =>
      expect(samples.testing.lastDay()).toStrictEqual([
        undefined,
        undefined,
        undefined,
      ]));
    test(":all", () =>
      expect(samples[":all"].lastDay()).toStrictEqual([
        undefined,
        undefined,
        undefined,
      ]));
  });
  describe("isFirstYear", () => {
    test("empty", () => expect(samples.empty.isFirstYear(2020)).toBe(false));
    test("testing", () =>
      expect(samples.testing.isFirstYear(2020)).toBe(false));
    test(":all", () => expect(samples[":all"].isFirstYear(2020)).toBe(false));
  });
  describe("isBeforeFirstYear", () => {
    test("empty", () =>
      expect(samples.empty.isBeforeFirstYear(2020)).toBe(true));
    test("testing", () =>
      expect(samples.testing.isBeforeFirstYear(2020)).toBe(true));
    test(":all", () =>
      expect(samples[":all"].isBeforeFirstYear(2020)).toBe(true));
  });
  describe("isFirstMonth", () => {
    test("empty", () =>
      expect(samples.empty.isFirstMonth(2020, 5)).toBe(false));
    test("testing", () =>
      expect(samples.testing.isFirstMonth(2020, 5)).toBe(false));
    test(":all", () =>
      expect(samples[":all"].isFirstMonth(2020, 5)).toBe(false));
  });
  describe("isBeforeFirstMonth", () => {
    test("empty", () =>
      expect(samples.empty.isBeforeFirstMonth(2020, 5)).toBe(true));
    test("testing", () =>
      expect(samples.testing.isBeforeFirstMonth(2020, 5)).toBe(true));
    test(":all", () =>
      expect(samples[":all"].isBeforeFirstMonth(2020, 5)).toBe(true));
  });
  describe("isFirstDay", () => {
    test("empty", () =>
      expect(samples.empty.isFirstDay(2020, 5, 27)).toBe(false));
    test("testing", () =>
      expect(samples.testing.isFirstDay(2020, 5, 27)).toBe(false));
    test(":all", () =>
      expect(samples[":all"].isFirstDay(2020, 5, 27)).toBe(false));
  });
  describe("isBeforeFirstDay", () => {
    test("empty", () =>
      expect(samples.empty.isBeforeFirstDay(2020, 5, 27)).toBe(true));
    test("testing", () =>
      expect(samples.testing.isBeforeFirstDay(2020, 5, 27)).toBe(true));
    test(":all", () =>
      expect(samples[":all"].isBeforeFirstDay(2020, 5, 27)).toBe(true));
  });
  describe("isLastYear", () => {
    test("empty", () => expect(samples.empty.isLastYear(2020)).toBe(false));
    test("testing", () => expect(samples.testing.isLastYear(2020)).toBe(false));
    test(":all", () => expect(samples[":all"].isLastYear(2020)).toBe(false));
  });
  describe("isAfterLasttYear", () => {
    test("empty", () =>
      expect(samples.empty.isAfterLasttYear(2020)).toBe(false));
    test("testing", () =>
      expect(samples.testing.isAfterLasttYear(2020)).toBe(false));
    test(":all", () =>
      expect(samples[":all"].isAfterLasttYear(2020)).toBe(false));
  });
  describe("isLastMonth", () => {
    test("empty", () => expect(samples.empty.isLastMonth(2020, 5)).toBe(false));
    test("testing", () =>
      expect(samples.testing.isLastMonth(2020, 5)).toBe(false));
    test(":all", () =>
      expect(samples[":all"].isLastMonth(2020, 5)).toBe(false));
  });
  describe("isAfterLastMonth", () => {
    test("empty", () =>
      expect(samples.empty.isAfterLastMonth(2020, 5)).toBe(false));
    test("testing", () =>
      expect(samples.testing.isAfterLastMonth(2020, 5)).toBe(false));
    test(":all", () =>
      expect(samples[":all"].isAfterLastMonth(2020, 5)).toBe(false));
  });
  describe("isLastDay", () => {
    test("empty", () =>
      expect(samples.empty.isLastDay(2020, 5, 27)).toBe(false));
    test("testing", () =>
      expect(samples.testing.isLastDay(2020, 5, 27)).toBe(false));
    test(":all", () =>
      expect(samples[":all"].isLastDay(2020, 5, 27)).toBe(false));
  });
  describe("isAfterLastDay", () => {
    test("empty", () =>
      expect(samples.empty.isAfterLastDay(2020, 5, 27)).toBe(false));
    test("testing", () =>
      expect(samples.testing.isAfterLastDay(2020, 5, 27)).toBe(false));
    test(":all", () =>
      expect(samples[":all"].isAfterLastDay(2020, 5, 27)).toBe(false));
  });
  describe("previousYear", () => {
    test("empty", () => expect(samples.empty.previousYear(2020)).toBe(2019));
    test("testing", () =>
      expect(samples.testing.previousYear(2020)).toBe(2019));
    test(":all", () => expect(samples[":all"].previousYear(2020)).toBe(2019));
  });
  describe("previousMonth", () => {
    test("empty", () =>
      expect(samples.empty.previousMonth(2020, 5)).toStrictEqual([2020, 4]));
    test("testing", () =>
      expect(samples.testing.previousMonth(2020, 5)).toStrictEqual([2020, 4]));
    test(":all", () =>
      expect(samples[":all"].previousMonth(2020, 5)).toStrictEqual([2020, 4]));
  });
  describe("previousDay", () => {
    test("empty", () =>
      expect(samples.empty.previousDay(2020, 5, 27)).toStrictEqual([
        2020,
        5,
        26,
      ]));
    test("testing", () =>
      expect(samples.testing.previousDay(2020, 5, 27)).toStrictEqual([
        2020,
        5,
        26,
      ]));
    test(":all", () =>
      expect(samples[":all"].previousDay(2020, 5, 27)).toStrictEqual([
        2020,
        5,
        26,
      ]));
  });
  describe("nextYear", () => {
    test("empty", () => expect(samples.empty.nextYear(2020)).toBe(2021));
    test("testing", () => expect(samples.testing.nextYear(2020)).toBe(2021));
    test(":all", () => expect(samples[":all"].nextYear(2020)).toBe(2021));
  });
  describe("nextMonth", () => {
    test("empty", () =>
      expect(samples.empty.nextMonth(2020, 5)).toStrictEqual([2020, 6]));
    test("testing", () =>
      expect(samples.testing.nextMonth(2020, 5)).toStrictEqual([2020, 6]));
    test(":all", () =>
      expect(samples[":all"].nextMonth(2020, 5)).toStrictEqual([2020, 6]));
  });
  describe("nextDay", () => {
    test("empty", () =>
      expect(samples.empty.nextDay(2020, 5, 27)).toStrictEqual([2020, 5, 28]));
    test("testing", () =>
      expect(samples.testing.nextDay(2020, 5, 27)).toStrictEqual([
        2020,
        5,
        28,
      ]));
    test(":all", () =>
      expect(samples[":all"].nextDay(2020, 5, 27)).toStrictEqual([
        2020,
        5,
        28,
      ]));
  });
  describe("currentPhotoIndex", () => {
    test("empty", () =>
      expect(samples.empty.currentPhotoIndex(2020, 5, 27, {})).toBe(-1));
    test("testing", () =>
      expect(samples.testing.currentPhotoIndex(2020, 5, 27, {})).toBe(-1));
    test(":all", () =>
      expect(samples[":all"].currentPhotoIndex(2020, 5, 27, {})).toBe(-1));
  });
  describe("firstPhoto", () => {
    test("empty", () => expect(samples.empty.firstPhoto()).toBeUndefined());
    test("testing", () => expect(samples.testing.firstPhoto()).toBeUndefined());
    test(":all", () => expect(samples[":all"].firstPhoto()).toBeUndefined());
  });
  describe("isFirstPhoto", () => {
    test("empty", () => expect(samples.empty.isFirstPhoto({})).toBe(false));
    test("testing", () => expect(samples.testing.isFirstPhoto({})).toBe(false));
    test(":all", () => expect(samples[":all"].isFirstPhoto({})).toBe(false));
  });
  describe("previousPhoto", () => {
    test("empty", () =>
      expect(samples.empty.previousPhoto(2020, 5, 27, {})).toStrictEqual({}));
    test("testing", () =>
      expect(samples.testing.previousPhoto(2020, 5, 27, {})).toStrictEqual({}));
    test(":all", () =>
      expect(samples[":all"].previousPhoto(2020, 5, 27, {})).toStrictEqual({}));
  });
  describe("nextPhoto", () => {
    test("empty", () =>
      expect(samples.empty.nextPhoto(2020, 5, 27, {})).toStrictEqual({}));
    test("testing", () =>
      expect(samples.testing.nextPhoto(2020, 5, 27, {})).toStrictEqual({}));
    test(":all", () =>
      expect(samples[":all"].nextPhoto(2020, 5, 27, {})).toStrictEqual({}));
  });
  describe("lastPhoto", () => {
    test("empty", () => expect(samples.empty.lastPhoto()).toBeUndefined());
    test("testing", () => expect(samples.testing.lastPhoto()).toBeUndefined());
    test(":all", () => expect(samples[":all"].lastPhoto()).toBeUndefined());
  });
  describe("isLastPhoto", () => {
    test("empty", () => expect(samples.empty.isLastPhoto({})).toBe(false));
    test("testing", () => expect(samples.testing.isLastPhoto({})).toBe(false));
    test(":all", () => expect(samples[":all"].isLastPhoto({})).toBe(false));
  });
});
describe("With photos", () => {
  let photos;
  let g;
  beforeAll(() => {
    photos = {
      "empty.jpg": PhotoModel({
        id: "empty.jpg",
        index: 0,
        title: "",
        description: "",
        taken: {
          instant: {
            timestamp: "2019-10-03 13:00:15",
            year: 2019,
            month: 10,
            day: 3,
            hour: 13,
            minute: 0,
            second: 15,
          },
          author: null,
          location: {
            country: null,
            place: null,
            coordinates: {},
          },
        },
        camera: {},
        lens: {},
        exposure: {
          focalLength: null,
          aperture: null,
          exposureTime: null,
          iso: null,
        },
        dimensions: {
          original: { width: null, height: null },
          display: { width: 1500, height: 1000 },
          thumbnail: { width: 300, height: 200 },
        },
      }),
      "1.jpg": PhotoModel({
        id: "1.jpg",
        index: 1,
        title: "Some title",
        description: "Some description",
        taken: {
          instant: {
            timestamp: "2020-05-27 14:01:16",
            year: 2020,
            month: 5,
            day: 27,
            hour: 14,
            minute: 1,
            second: 16,
          },
          author: "Author One",
          location: {
            country: "jp",
            place: "Some place",
            coordinates: {
              latitude: 30,
              longitude: -30,
              altitude: null,
            },
          },
        },
        camera: { make: "CMake", model: "CModel", serial: null },
        lens: { make: "LMake", model: "LModel", serial: null },
        exposure: {
          focalLength: 23,
          aperture: 2.8,
          exposureTime: 0.01,
          iso: 100,
        },
        dimensions: {
          original: { width: 2000, height: 3000 },
          display: { width: 1000, height: 1500 },
          thumbnail: { width: 200, height: 300 },
        },
      }),
      "2.jpg": PhotoModel({
        id: "2.jpg",
        index: 1,
        title: "Some title",
        description: "Some description",
        taken: {
          instant: {
            timestamp: "2020-05-27 15:02:17",
            year: 2020,
            month: 5,
            day: 27,
            hour: 15,
            minute: 2,
            second: 17,
          },
          author: "Author One",
          location: {
            country: "jp",
            place: "Some place",
            coordinates: {
              latitude: 30,
              longitude: -30,
              altitude: null,
            },
          },
        },
        camera: { make: "CMake", model: "CModel", serial: null },
        lens: { make: "LMake", model: "LModel", serial: null },
        exposure: {
          focalLength: 23,
          aperture: 2.8,
          exposureTime: 0.01,
          iso: 100,
        },
        dimensions: {
          original: { width: 2000, height: 3000 },
          display: { width: 1000, height: 1500 },
          thumbnail: { width: 200, height: 300 },
        },
      }),
    };
    g = {
      empty: samples.empty.withPhotos([photos["empty.jpg"], photos["1.jpg"]]),
      testing: samples.testing.withPhotos([
        photos["empty.jpg"],
        photos["1.jpg"],
      ]),
      all: samples[":all"].withPhotos([photos["empty.jpg"], photos["1.jpg"]]),
      public: samples[":public"].withPhotos([
        photos["empty.jpg"],
        photos["1.jpg"],
      ]),
      daily: samples.daily.withPhotos([
        photos["empty.jpg"],
        photos["1.jpg"],
        photos["2.jpg"],
      ]),
      badInitial: samples.badInitial.withPhotos([
        photos["empty.jpg"],
        photos["1.jpg"],
      ]),
    };
  });
  describe("title(year, month, day, photo)", () => {
    test("empty.jpg in empty", () =>
      expect(g.empty.title(2019, 10, 3, photos["empty.jpg"])).toBe(
        "#1 — 2019-10-03 — "
      ));
    test("empty.jpg", () =>
      expect(g.testing.title(2019, 10, 3, photos["empty.jpg"])).toBe(
        "#1 — 2019-10-03 — gallery testing"
      ));
    test("1.jpg", () =>
      expect(g.testing.title(2020, 5, 27, photos["1.jpg"])).toBe(
        "#2 — 2020-05-27 — gallery testing"
      ));
  });
  describe("lastPath", () => {
    test("empty", () => expect(g.empty.lastPath()).toBe("/g/empty/2020/05"));
    test("testing", () =>
      expect(g.testing.lastPath()).toBe("/g/testing/2020/05"));
    test("all", () => expect(g.all.lastPath()).toBe("/g/:all/2020"));
    test("public", () =>
      expect(g.public.lastPath()).toBe("/g/:all/2020/05/27/1.jpg"));
    test("daily", () => expect(g.daily.lastPath()).toBe("/g/:all/2020/05/27"));
    test("badInitial", () =>
      expect(g.badInitial.lastPath()).toBe("/g/:all/2020/05"));
  });
  describe("includesPhotos", () => {
    test("testing", () => expect(g.testing.includesPhotos()).toBe(true));
  });
  describe("includesYear", () => {
    test("2018", () => expect(g.testing.includesYear(2018)).toBe(false));
    test("2019", () => expect(g.testing.includesYear(2019)).toBe(true));
    test("2020", () => expect(g.testing.includesYear(2020)).toBe(true));
    test("2021", () => expect(g.testing.includesYear(2021)).toBe(false));
  });
  describe("includesMonth", () => {
    test("2019-09", () => expect(g.testing.includesMonth(2019, 9)).toBe(false));
    test("2019-10", () => expect(g.testing.includesMonth(2019, 10)).toBe(true));
    test("2020-05", () => expect(g.testing.includesMonth(2020, 5)).toBe(true));
    test("2020-06", () => expect(g.testing.includesMonth(2020, 6)).toBe(false));
  });
  describe("includesDay", () => {
    test("2019-10-02", () =>
      expect(g.testing.includesDay(2019, 10, 2)).toBe(false));
    test("2019-10-03", () =>
      expect(g.testing.includesDay(2019, 10, 3)).toBe(true));
    test("2020-05-27", () =>
      expect(g.testing.includesDay(2020, 5, 27)).toBe(true));
    test("2020-05-28", () =>
      expect(g.testing.includesDay(2020, 5, 28)).toBe(false));
  });
  describe("includesPhoto", () => {
    test("2019-10-02 empty.jpg", () =>
      expect(g.testing.includesPhoto(2019, 10, 2, photos["empty.jpg"])).toBe(
        false
      ));
    test("2019-10-03 empty.jpg", () =>
      expect(g.testing.includesPhoto(2019, 10, 3, photos["empty.jpg"])).toBe(
        true
      ));
    test("2020-05-27 empty.jpg", () =>
      expect(g.testing.includesPhoto(2020, 5, 27, photos["empty.jpg"])).toBe(
        false
      ));
    test("2019-20-03 1.jpg", () =>
      expect(g.testing.includesPhoto(2019, 10, 3, photos["1.jpg"])).toBe(
        false
      ));
    test("2020-05-27 1.jpg", () =>
      expect(g.testing.includesPhoto(2020, 5, 27, photos["1.jpg"])).toBe(true));
  });
  describe("countPhotos", () => {
    test("2019-10-03", () =>
      expect(g.testing.countPhotos(2019, 10, 2)).toBe(0));
    test("2019-10-03", () =>
      expect(g.testing.countPhotos(2019, 10, 3)).toBe(1));
    test("2020-05-27", () =>
      expect(g.testing.countPhotos(2020, 5, 27)).toBe(1));
    test("2020-05-27", () =>
      expect(g.testing.countPhotos(2020, 5, 28)).toBe(0));
  });
  describe("maxDayCount", () => {
    test("testing 2020-05-27", () =>
      expect(g.testing.maxDayCount(2020, 5, 27)).toBe(1));
    test("testing 2020-05", () =>
      expect(g.testing.maxDayCount(2020, 5)).toBe(1));
    test("testing 2020", () => expect(g.testing.maxDayCount(2020)).toBe(1));
    test("testing", () => expect(g.testing.maxDayCount()).toBe(1));
    test("daily 2020-05-27", () =>
      expect(g.daily.maxDayCount(2020, 5, 27)).toBe(2));
    test("daily 2020-05", () => expect(g.daily.maxDayCount(2020, 5)).toBe(2));
    test("daily 2020", () => expect(g.daily.maxDayCount(2020)).toBe(2));
    test("daily", () => expect(g.daily.maxDayCount()).toBe(2));
  });
  describe("photos", () => {
    test("all", () =>
      expect(g.testing.photos()).toStrictEqual([
        photos["empty.jpg"],
        photos["1.jpg"],
      ]));
    test("2019-10-03", () =>
      expect(g.testing.photos(2019, 10, 3)).toStrictEqual([
        photos["empty.jpg"],
      ]));
    test("2020-05-27", () =>
      expect(g.testing.photos(2020, 5, 27)).toStrictEqual([photos["1.jpg"]]));
    test("2020-05-28", () =>
      expect(g.testing.photos(2020, 5, 28)).toStrictEqual([]));
  });
  describe("photo", () => {
    test("2019-10-03 empty.jpg", () =>
      expect(g.testing.photo(2019, 10, 3, "empty.jpg")).toStrictEqual(
        photos["empty.jpg"]
      ));
    test("2020-05-27 1.jpg", () =>
      expect(g.testing.photo(2020, 5, 27, "1.jpg")).toStrictEqual(
        photos["1.jpg"]
      ));
    test("2020-05-27 empty.jpg", () =>
      expect(g.testing.photo(2020, 5, 27, "empty.jpg")).toBeUndefined());
    test("2020-05-28 empty.jpg", () =>
      expect(g.testing.photo(2020, 5, 27, "empty.jpg")).toBeUndefined());
  });
  describe("Mappers", () => {
    let mock;
    beforeEach(() => {
      mock = jest.fn((year) => [year]);
    });
    describe("mapYears", () => {
      test("testing", () => {
        expect(g.testing.mapYears(mock)).toStrictEqual([[2019], [2020]]);
        expect(mock).toHaveBeenCalledTimes(2);
      });
    });
    describe("flatMapYears", () => {
      test("testing", () => {
        expect(g.testing.flatMapYears(mock)).toStrictEqual([2019, 2020]);
        expect(mock).toHaveBeenCalledTimes(2);
      });
    });
    describe("mapMonths", () => {
      test("testing 2019", () => {
        expect(g.testing.mapMonths(2019, mock)).toStrictEqual([[10]]);
        expect(mock).toHaveBeenCalledTimes(1);
      });
      test("testing 2020", () => {
        expect(g.testing.mapMonths(2020, mock)).toStrictEqual([[5]]);
        expect(mock).toHaveBeenCalledTimes(1);
      });
      test("testing 2021", () => {
        expect(g.testing.mapMonths(2021, mock)).toStrictEqual(undefined);
        expect(mock).not.toHaveBeenCalled();
      });
    });
    describe("flatMapMonths", () => {
      test("testing 2019", () => {
        expect(g.testing.flatMapMonths(2019, mock)).toStrictEqual([10]);
        expect(mock).toHaveBeenCalledTimes(1);
      });
      test("testing 2020", () => {
        expect(g.testing.flatMapMonths(2020, mock)).toStrictEqual([5]);
        expect(mock).toHaveBeenCalledTimes(1);
      });
      test("testing 2021", () => {
        expect(g.testing.flatMapMonths(2021, mock)).toStrictEqual([]);
        expect(mock).not.toHaveBeenCalled();
      });
    });
    describe("mapDays", () => {
      test("testing 2019-10", () => {
        expect(g.testing.mapDays(2019, 10, mock)).toStrictEqual([[3]]);
        expect(mock).toHaveBeenCalledTimes(1);
      });
      test("testing 2020-05", () => {
        expect(g.testing.mapDays(2020, 5, mock)).toStrictEqual([[27]]);
        expect(mock).toHaveBeenCalledTimes(1);
      });
      test("testing 2020-06", () => {
        expect(g.testing.mapDays(2020, 6, mock)).toStrictEqual(undefined);
        expect(mock).not.toHaveBeenCalled();
      });
    });
    describe("flatMapDays", () => {
      test("testing 2019-10", () => {
        expect(g.testing.flatMapDays(2019, 10, mock)).toStrictEqual([3]);
        expect(mock).toHaveBeenCalledTimes(1);
      });
      test("testing 2020-05", () => {
        expect(g.testing.flatMapDays(2020, 5, mock)).toStrictEqual([27]);
        expect(mock).toHaveBeenCalledTimes(1);
      });
      test("testing 2020-06", () => {
        expect(g.testing.flatMapDays(2020, 6, mock)).toStrictEqual([]);
        expect(mock).not.toHaveBeenCalled();
      });
    });
  });
  describe("firstYear", () => {
    test("testing", () => expect(g.testing.firstYear()).toBe(2019));
  });
  describe("firstMonth", () => {
    test("testing", () =>
      expect(g.testing.firstMonth()).toStrictEqual([2019, 10]));
  });
  describe("firstDay", () => {
    test("testing", () =>
      expect(g.testing.firstDay()).toStrictEqual([2019, 10, 3]));
  });
  describe("lastYear", () => {
    test("testing", () => expect(g.testing.lastYear()).toBe(2020));
  });
  describe("lastMonth", () => {
    test("testing", () =>
      expect(g.testing.lastMonth()).toStrictEqual([2020, 5]));
  });
  describe("lastDay", () => {
    test("testing", () =>
      expect(g.testing.lastDay()).toStrictEqual([2020, 5, 27]));
  });
  describe("isFirstYear", () => {
    test("testing 2018", () => expect(g.testing.isFirstYear(2018)).toBe(false));
    test("testing 2019", () => expect(g.testing.isFirstYear(2019)).toBe(true));
    test("testing 2020", () => expect(g.testing.isFirstYear(2020)).toBe(false));
    test("testing 2021", () => expect(g.testing.isFirstYear(2021)).toBe(false));
  });
  describe("isBeforeFirstYear", () => {
    test("testing 2018", () =>
      expect(g.testing.isBeforeFirstYear(2018)).toBe(true));
    test("testing 2019", () =>
      expect(g.testing.isBeforeFirstYear(2019)).toBe(true));
    test("testing 2020", () =>
      expect(g.testing.isBeforeFirstYear(2020)).toBe(false));
    test("testing 2021", () =>
      expect(g.testing.isBeforeFirstYear(2021)).toBe(false));
  });
  describe("isFirstMonth", () => {
    test("testing 2019-09", () =>
      expect(g.testing.isFirstMonth(2019, 9)).toBe(false));
    test("testing 2019-10", () =>
      expect(g.testing.isFirstMonth(2019, 10)).toBe(true));
    test("testing 2020-05", () =>
      expect(g.testing.isFirstMonth(2020, 5)).toBe(false));
    test("testing 2020-06", () =>
      expect(g.testing.isFirstMonth(2020, 6)).toBe(false));
  });
  describe("isBeforeFirstMonth", () => {
    test("testing 2019-09", () =>
      expect(g.testing.isBeforeFirstMonth(2019, 9)).toBe(true));
    test("testing 2019-10", () =>
      expect(g.testing.isBeforeFirstMonth(2019, 10)).toBe(true));
    test("testing 2020-05", () =>
      expect(g.testing.isBeforeFirstMonth(2020, 5)).toBe(false));
    test("testing 2020-06", () =>
      expect(g.testing.isBeforeFirstMonth(2020, 6)).toBe(false));
  });
  describe("isFirstDay", () => {
    test("testing 2019-10-02", () =>
      expect(g.testing.isFirstDay(2019, 10, 2)).toBe(false));
    test("testing 2019-10-03", () =>
      expect(g.testing.isFirstDay(2019, 10, 3)).toBe(true));
    test("testing 2020-05-27", () =>
      expect(g.testing.isFirstDay(2020, 5, 27)).toBe(false));
    test("testing 2020-05-28", () =>
      expect(g.testing.isFirstDay(2020, 5, 28)).toBe(false));
  });
  describe("isBeforeFirstDay", () => {
    test("testing 2019-10-02", () =>
      expect(g.testing.isBeforeFirstDay(2019, 10, 2)).toBe(true));
    test("testing 2019-10-03", () =>
      expect(g.testing.isBeforeFirstDay(2019, 10, 3)).toBe(true));
    test("testing 2020-05-27", () =>
      expect(g.testing.isBeforeFirstDay(2020, 5, 27)).toBe(false));
    test("testing 2020-05-28", () =>
      expect(g.testing.isBeforeFirstDay(2020, 5, 28)).toBe(false));
  });
  describe("isLastYear", () => {
    test("testing 2018", () => expect(g.testing.isLastYear(2018)).toBe(false));
    test("testing 2019", () => expect(g.testing.isLastYear(2019)).toBe(false));
    test("testing 2020", () => expect(g.testing.isLastYear(2020)).toBe(true));
    test("testing 2021", () => expect(g.testing.isLastYear(2021)).toBe(false));
  });
  describe("isAfterLasttYear", () => {
    test("testing 2018", () =>
      expect(g.testing.isAfterLasttYear(2018)).toBe(false));
    test("testing 2019", () =>
      expect(g.testing.isAfterLasttYear(2019)).toBe(false));
    test("testing 2020", () =>
      expect(g.testing.isAfterLasttYear(2020)).toBe(true));
    test("testing 2021", () =>
      expect(g.testing.isAfterLasttYear(2021)).toBe(true));
  });
  describe("isLastMonth", () => {
    test("testing 2019-09", () =>
      expect(g.testing.isLastMonth(2019, 9)).toBe(false));
    test("testing 2019-10", () =>
      expect(g.testing.isLastMonth(2019, 10)).toBe(false));
    test("testing 2020-05", () =>
      expect(g.testing.isLastMonth(2020, 5)).toBe(true));
    test("testing 2020-06", () =>
      expect(g.testing.isLastMonth(2020, 6)).toBe(false));
  });
  describe("isAfterLastMonth", () => {
    test("testing 2019-09", () =>
      expect(g.testing.isAfterLastMonth(2019, 9)).toBe(false));
    test("testing 2019-10", () =>
      expect(g.testing.isAfterLastMonth(2019, 10)).toBe(false));
    test("testing 2020-05", () =>
      expect(g.testing.isAfterLastMonth(2020, 5)).toBe(true));
    test("testing 2020-06", () =>
      expect(g.testing.isAfterLastMonth(2020, 6)).toBe(true));
  });
  describe("isLastDay", () => {
    test("testing 2019-10-02", () =>
      expect(g.testing.isLastDay(2019, 10, 2)).toBe(false));
    test("testing 2019-10-03", () =>
      expect(g.testing.isLastDay(2019, 10, 3)).toBe(false));
    test("testing 2020-05-27", () =>
      expect(g.testing.isLastDay(2020, 5, 27)).toBe(true));
    test("testing 2020-05-28", () =>
      expect(g.testing.isLastDay(2020, 5, 28)).toBe(false));
  });
  describe("isAfterLastDay", () => {
    test("testing 2019-10-02", () =>
      expect(g.testing.isAfterLastDay(2019, 10, 2)).toBe(false));
    test("testing 2019-10-03", () =>
      expect(g.testing.isAfterLastDay(2019, 10, 3)).toBe(false));
    test("testing 2020-05-27", () =>
      expect(g.testing.isAfterLastDay(2020, 5, 27)).toBe(true));
    test("testing 2020-05-28", () =>
      expect(g.testing.isAfterLastDay(2020, 5, 28)).toBe(true));
  });
  describe("previousYear", () => {
    test("testing 2017", () => expect(g.testing.previousYear(2017)).toBe(2019));
    test("testing 2018", () => expect(g.testing.previousYear(2018)).toBe(2019));
    test("testing 2019", () => expect(g.testing.previousYear(2019)).toBe(2019));
    test("testing 2020", () => expect(g.testing.previousYear(2020)).toBe(2019));
    test("testing 2021", () => expect(g.testing.previousYear(2021)).toBe(2020));
    test("testing 2022", () => expect(g.testing.previousYear(2022)).toBe(2020));
  });
  describe("previousMonth", () => {
    test("testing 2019-09", () =>
      expect(g.testing.previousMonth(2019, 9)).toStrictEqual([2019, 10]));
    test("testing 2019-10", () =>
      expect(g.testing.previousMonth(2019, 10)).toStrictEqual([2019, 10]));
    test("testing 2020-05", () =>
      expect(g.testing.previousMonth(2020, 5)).toStrictEqual([2019, 10]));
    test("testing 2020-06", () =>
      expect(g.testing.previousMonth(2020, 6)).toStrictEqual([2020, 5]));
  });
  describe("previousDay", () => {
    test("testing 2019-10-02", () =>
      expect(g.testing.previousDay(2019, 10, 2)).toStrictEqual([2019, 10, 3]));
    test("testing 2019-10-03", () =>
      expect(g.testing.previousDay(2019, 10, 3)).toStrictEqual([2019, 10, 3]));
    test("testing 2020-05-27", () =>
      expect(g.testing.previousDay(2020, 5, 27)).toStrictEqual([2019, 10, 3]));
    test("testing 2020-06-28", () =>
      expect(g.testing.previousDay(2020, 5, 28)).toStrictEqual([2020, 5, 27]));
  });
  describe("nextYear", () => {
    test("testing 2017", () => expect(g.testing.nextYear(2017)).toBe(2019));
    test("testing 2018", () => expect(g.testing.nextYear(2018)).toBe(2019));
    test("testing 2019", () => expect(g.testing.nextYear(2019)).toBe(2020));
    test("testing 2020", () => expect(g.testing.nextYear(2020)).toBe(2020));
    test("testing 2021", () => expect(g.testing.nextYear(2021)).toBe(2020));
    test("testing 2022", () => expect(g.testing.nextYear(2022)).toBe(2020));
  });
  describe("nextMonth", () => {
    test("testing 2019-09", () =>
      expect(g.testing.nextMonth(2019, 9)).toStrictEqual([2019, 10]));
    test("testing 2019-10", () =>
      expect(g.testing.nextMonth(2019, 10)).toStrictEqual([2020, 5]));
    test("testing 2020-05", () =>
      expect(g.testing.nextMonth(2020, 5)).toStrictEqual([2020, 5]));
    test("testing 2020-06", () =>
      expect(g.testing.nextMonth(2020, 6)).toStrictEqual([2020, 5]));
  });
  describe("nextDay", () => {
    test("testing 2019-10-02", () =>
      expect(g.testing.nextDay(2019, 10, 2)).toStrictEqual([2019, 10, 3]));
    test("testing 2019-10-03", () =>
      expect(g.testing.nextDay(2019, 10, 3)).toStrictEqual([2020, 5, 27]));
    test("testing 2020-05-27", () =>
      expect(g.testing.nextDay(2020, 5, 27)).toStrictEqual([2020, 5, 27]));
    test("testing 2020-06-28", () =>
      expect(g.testing.nextDay(2020, 5, 28)).toStrictEqual([2020, 5, 27]));
  });
  describe("currentPhotoIndex", () => {
    test("2019-10-02 empty.jpg", () =>
      expect(
        g.testing.currentPhotoIndex(2019, 10, 2, photos["empty.jpg"])
      ).toBe(-1));
    test("2019-10-03 empty.jpg", () =>
      expect(
        g.testing.currentPhotoIndex(2019, 10, 3, photos["empty.jpg"])
      ).toBe(0));
    test("2020-05-27 empty.jpg", () =>
      expect(
        g.testing.currentPhotoIndex(2020, 5, 27, photos["empty.jpg"])
      ).toBe(-1));
    test("2019-10-02 1.jpg", () =>
      expect(g.testing.currentPhotoIndex(2019, 10, 2, photos["1.jpg"])).toBe(
        -1
      ));
    test("2019-10-03 1.jpg", () =>
      expect(g.testing.currentPhotoIndex(2019, 10, 3, photos["1.jpg"])).toBe(
        -1
      ));
    test("2020-05-27 1.jpg", () =>
      expect(g.testing.currentPhotoIndex(2020, 5, 27, photos["1.jpg"])).toBe(
        0
      ));
  });
  describe("firstPhoto", () => {
    test("testing", () =>
      expect(g.testing.firstPhoto()).toStrictEqual(photos["empty.jpg"]));
  });
  describe("isFirstPhoto", () => {
    test("empty.jpg", () =>
      expect(g.testing.isFirstPhoto(photos["empty.jpg"])).toBe(true));
    test("1.jpg", () =>
      expect(g.testing.isFirstPhoto(photos["1.jpg"])).toBe(false));
  });
  describe("previousPhoto", () => {
    test("empty.jpg", () =>
      expect(
        g.testing.previousPhoto(2019, 10, 3, photos["empty.jpg"])
      ).toStrictEqual(photos["empty.jpg"]));
    test("1.jpg", () =>
      expect(
        g.testing.previousPhoto(2020, 5, 27, photos["1.jpg"])
      ).toStrictEqual(photos["empty.jpg"]));
    test("daily 2.jpg", () =>
      expect(g.daily.previousPhoto(2020, 5, 27, photos["2.jpg"])).toStrictEqual(
        photos["1.jpg"]
      ));
  });
  describe("nextPhoto", () => {
    test("empty.jpg", () =>
      expect(
        g.testing.nextPhoto(2019, 10, 3, photos["empty.jpg"])
      ).toStrictEqual(photos["1.jpg"]));
    test("1.jpg", () =>
      expect(g.testing.nextPhoto(2020, 5, 27, photos["1.jpg"])).toStrictEqual(
        photos["1.jpg"]
      ));
    test("daily 1.jpg", () =>
      expect(g.daily.nextPhoto(2020, 5, 27, photos["1.jpg"])).toStrictEqual(
        photos["2.jpg"]
      ));
  });
  describe("lastPhoto", () => {
    test("testing", () =>
      expect(g.testing.lastPhoto()).toStrictEqual(photos["1.jpg"]));
  });
  describe("isLastPhoto", () => {
    test("empty.jpg", () =>
      expect(g.testing.isLastPhoto(photos["empty.jpg"])).toBe(false));
    test("1.jpg", () =>
      expect(g.testing.isLastPhoto(photos["1.jpg"])).toBe(true));
  });
});
