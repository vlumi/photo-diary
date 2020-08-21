import stats from "./stats";
import PhotoModel from "../models/PhotoModel";

describe("decodeTableRowKey", () => {
  test("Number value", () =>
    expect(stats.decodeTableRowKey('{"value":42,"isUnknown":false}')).toBe(42));
  test("String value", () =>
    expect(stats.decodeTableRowKey('{"value":"42","isUnknown":false}')).toBe(
      "42"
    ));
  test("Undefined value", () =>
    expect(stats.decodeTableRowKey('{"value":null,"isUnknown":false}')).toBe(
      null
    ));
  test("Unknown value", () =>
    expect(stats.decodeTableRowKey('{"value":null,"isUnknown":true}')).toBe(
      stats.UNKNOWN
    ));
});
describe("generate", () => {
  test("Empty", async () =>
    expect(await stats.generate([], {})).toStrictEqual({
      count: {
        byAuthor: {},
        byCountry: {},
        byExposure: {},
        byGear: {},
        byTime: {
          byHour: {
            "0": 0,
            "1": 0,
            "2": 0,
            "3": 0,
            "4": 0,
            "5": 0,
            "6": 0,
            "7": 0,
            "8": 0,
            "9": 0,
            "10": 0,
            "11": 0,
            "12": 0,
            "13": 0,
            "14": 0,
            "15": 0,
            "16": 0,
            "17": 0,
            "18": 0,
            "19": 0,
            "20": 0,
            "21": 0,
            "22": 0,
            "23": 0,
          },
          byMonth: {
            "1": 0,
            "2": 0,
            "3": 0,
            "4": 0,
            "5": 0,
            "6": 0,
            "7": 0,
            "8": 0,
            "9": 0,
            "10": 0,
            "11": 0,
            "12": 0,
          },
          byWeekday: {
            "0": 0,
            "1": 0,
            "2": 0,
            "3": 0,
            "4": 0,
            "5": 0,
            "6": 0,
          },
          byYear: {},
          byYearMonth: {},
          daysInYear: {},
          daysInYearMonth: {},
        },
        total: 0,
      },
    }));
  test("One photo", async () =>
    expect(
      await stats.generate(
        [
          PhotoModel({
            id: "1.jpg",
            index: 0,
            title: "",
            description: "",
            taken: {
              instant: {
                timestamp: "2020-01-01 13:00:15",
                year: 2020,
                month: 1,
                day: 1,
                hour: 13,
                minute: 0,
                second: 15,
              },
              author: "Author One",
              location: {
                country: "jp",
                place: "",
                coordinates: {
                  latitude: 30,
                  longitude: 30,
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
              original: { width: 3000, height: 2000 },
              display: { width: 1500, height: 1000 },
              thumbnail: { width: 300, height: 200 },
            },
          }),
        ],
        {}
      )
    ).toStrictEqual({
      count: {
        byAuthor: {
          "Author One": 1,
        },
        byCountry: {
          jp: 1,
        },
        byExposure: {
          byAperture: {
            "2.8": 1,
          },
          byExposureTime: {
            "0.01": 1,
          },
          byExposureValue: {
            "9.5": 1,
          },
          byFocalLength: {
            "23": 1,
          },
          byIso: {
            "100": 1,
          },
          byLightValue: {
            "9.5": 1,
          },
          byResolution: {
            "6": 1,
          },
          byOrientation: {
            landscape: 1,
          },
        },
        byGear: {
          byCamera: {
            "CMake CModel": 1,
          },
          byCameraLens: {
            '["CMake CModel","LMake LModel"]': 1,
          },
          byCameraMake: {
            CMake: 1,
          },
          byLens: {
            "LMake LModel": 1,
          },
        },
        byTime: {
          byHour: {
            "0": 0,
            "1": 0,
            "2": 0,
            "3": 0,
            "4": 0,
            "5": 0,
            "6": 0,
            "7": 0,
            "8": 0,
            "9": 0,
            "10": 0,
            "11": 0,
            "12": 0,
            "13": 1,
            "14": 0,
            "15": 0,
            "16": 0,
            "17": 0,
            "18": 0,
            "19": 0,
            "20": 0,
            "21": 0,
            "22": 0,
            "23": 0,
          },
          byMonth: {
            "1": 1,
            "2": 0,
            "3": 0,
            "4": 0,
            "5": 0,
            "6": 0,
            "7": 0,
            "8": 0,
            "9": 0,
            "10": 0,
            "11": 0,
            "12": 0,
          },
          byWeekday: {
            "0": 0,
            "1": 0,
            "2": 0,
            "3": 1,
            "4": 0,
            "5": 0,
            "6": 0,
          },
          byYear: { "2020": 1 },
          byYearMonth: {
            "2020": {
              "1": 1,
            },
          },
          years: 1,
          months: 1,
          days: 1,
          daysInYear: {
            "2020": 1,
          },
          daysInYearMonth: {
            "2020": {
              "1": 1,
            },
          },
          maxDate: {
            day: 1,
            month: 1,
            year: 2020,
          },
          minDate: {
            day: 1,
            month: 1,
            year: 2020,
          },
        },
        total: 1,
      },
    }));
  test("One photo with no metadata", async () =>
    expect(
      await stats.generate(
        [
          PhotoModel({
            id: "1.jpg",
            index: 0,
            title: "",
            description: "",
            taken: {
              instant: {
                timestamp: "2020-01-01 13:00:15",
                year: 2020,
                month: 1,
                day: 1,
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
        ],
        {}
      )
    ).toStrictEqual({
      count: {
        byAuthor: {
          unknown: 1,
        },
        byCountry: {
          unknown: 1,
        },
        byExposure: {
          byAperture: {
            unknown: 1,
          },
          byExposureTime: {
            unknown: 1,
          },
          byExposureValue: {
            unknown: 1,
          },
          byFocalLength: {
            unknown: 1,
          },
          byIso: {
            unknown: 1,
          },
          byLightValue: {
            unknown: 1,
          },
          byResolution: {
            unknown: 1,
          },
          byOrientation: {
            landscape: 1,
          },
        },
        byGear: {
          byCamera: {
            unknown: 1,
          },
          byCameraLens: {
            '["unknown","unknown"]': 1,
          },
          byCameraMake: {
            unknown: 1,
          },
          byLens: {
            unknown: 1,
          },
        },
        byTime: {
          byHour: {
            "0": 0,
            "1": 0,
            "2": 0,
            "3": 0,
            "4": 0,
            "5": 0,
            "6": 0,
            "7": 0,
            "8": 0,
            "9": 0,
            "10": 0,
            "11": 0,
            "12": 0,
            "13": 1,
            "14": 0,
            "15": 0,
            "16": 0,
            "17": 0,
            "18": 0,
            "19": 0,
            "20": 0,
            "21": 0,
            "22": 0,
            "23": 0,
          },
          byMonth: {
            "1": 1,
            "2": 0,
            "3": 0,
            "4": 0,
            "5": 0,
            "6": 0,
            "7": 0,
            "8": 0,
            "9": 0,
            "10": 0,
            "11": 0,
            "12": 0,
          },
          byWeekday: {
            "0": 0,
            "1": 0,
            "2": 0,
            "3": 1,
            "4": 0,
            "5": 0,
            "6": 0,
          },
          byYear: { "2020": 1 },
          byYearMonth: {
            "2020": {
              "1": 1,
            },
          },
          years: 1,
          months: 1,
          days: 1,
          daysInYear: {
            "2020": 1,
          },
          daysInYearMonth: {
            "2020": {
              "1": 1,
            },
          },
          maxDate: {
            day: 1,
            month: 1,
            year: 2020,
          },
          minDate: {
            day: 1,
            month: 1,
            year: 2020,
          },
        },
        total: 1,
      },
    }));
  test("Two photos years apart", async () =>
    expect(
      await stats.generate(
        [
          PhotoModel({
            id: "1.jpg",
            index: 0,
            title: "",
            description: "",
            taken: {
              instant: {
                timestamp: "1995-01-01 13:00:15",
                year: 1995,
                month: 1,
                day: 1,
                hour: 13,
                minute: 0,
                second: 15,
              },
              author: "Author One",
              location: {
                country: "jp",
                place: "",
                coordinates: {
                  latitude: 30,
                  longitude: 30,
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
              original: { width: 3000, height: 2000 },
              display: { width: 1500, height: 1000 },
              thumbnail: { width: 300, height: 200 },
            },
          }),
          PhotoModel({
            id: "2.jpg",
            index: 0,
            title: "",
            description: "",
            taken: {
              instant: {
                timestamp: "2001-03-10 13:00:15",
                year: 2001,
                month: 3,
                day: 10,
                hour: 13,
                minute: 0,
                second: 15,
              },
              author: "Author One",
              location: {
                country: "jp",
                place: "",
                coordinates: {
                  latitude: 30,
                  longitude: 30,
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
              original: { width: 3000, height: 2000 },
              display: { width: 1500, height: 1000 },
              thumbnail: { width: 300, height: 200 },
            },
          }),
        ],
        {}
      )
    ).toStrictEqual({
      count: {
        byAuthor: {
          "Author One": 2,
        },
        byCountry: {
          jp: 2,
        },
        byExposure: {
          byAperture: {
            "2.8": 2,
          },
          byExposureTime: {
            "0.01": 2,
          },
          byExposureValue: {
            "9.5": 2,
          },
          byFocalLength: {
            "23": 2,
          },
          byIso: {
            "100": 2,
          },
          byLightValue: {
            "9.5": 2,
          },
          byResolution: {
            "6": 2,
          },
          byOrientation: {
            landscape: 2,
          },
        },
        byGear: {
          byCamera: {
            "CMake CModel": 2,
          },
          byCameraLens: {
            '["CMake CModel","LMake LModel"]': 2,
          },
          byCameraMake: {
            CMake: 2,
          },
          byLens: {
            "LMake LModel": 2,
          },
        },
        byTime: {
          byHour: {
            "0": 0,
            "1": 0,
            "10": 0,
            "11": 0,
            "12": 0,
            "13": 2,
            "14": 0,
            "15": 0,
            "16": 0,
            "17": 0,
            "18": 0,
            "19": 0,
            "2": 0,
            "20": 0,
            "21": 0,
            "22": 0,
            "23": 0,
            "3": 0,
            "4": 0,
            "5": 0,
            "6": 0,
            "7": 0,
            "8": 0,
            "9": 0,
          },
          byMonth: {
            "1": 1,
            "2": 0,
            "3": 1,
            "4": 0,
            "5": 0,
            "6": 0,
            "7": 0,
            "8": 0,
            "9": 0,
            "10": 0,
            "11": 0,
            "12": 0,
          },
          byWeekday: {
            "0": 1,
            "1": 0,
            "2": 0,
            "3": 0,
            "4": 0,
            "5": 0,
            "6": 1,
          },
          byYear: {
            "1995": 1,
            "1996": 0,
            "1997": 0,
            "1998": 0,
            "1999": 0,
            "2000": 0,
            "2001": 1,
          },
          byYearMonth: {
            "1995": {
              "1": 1,
              "2": 0,
              "3": 0,
              "4": 0,
              "5": 0,
              "6": 0,
              "7": 0,
              "8": 0,
              "9": 0,
              "10": 0,
              "11": 0,
              "12": 0,
            },
            "1996": {
              "1": 0,
              "2": 0,
              "3": 0,
              "4": 0,
              "5": 0,
              "6": 0,
              "7": 0,
              "8": 0,
              "9": 0,
              "10": 0,
              "11": 0,
              "12": 0,
            },
            "1997": {
              "1": 0,
              "2": 0,
              "3": 0,
              "4": 0,
              "5": 0,
              "6": 0,
              "7": 0,
              "8": 0,
              "9": 0,
              "10": 0,
              "11": 0,
              "12": 0,
            },
            "1998": {
              "1": 0,
              "2": 0,
              "3": 0,
              "4": 0,
              "5": 0,
              "6": 0,
              "7": 0,
              "8": 0,
              "9": 0,
              "10": 0,
              "11": 0,
              "12": 0,
            },
            "1999": {
              "1": 0,
              "2": 0,
              "3": 0,
              "4": 0,
              "5": 0,
              "6": 0,
              "7": 0,
              "8": 0,
              "9": 0,
              "10": 0,
              "11": 0,
              "12": 0,
            },
            "2000": {
              "1": 0,
              "2": 0,
              "3": 0,
              "4": 0,
              "5": 0,
              "6": 0,
              "7": 0,
              "8": 0,
              "9": 0,
              "10": 0,
              "11": 0,
              "12": 0,
            },
            "2001": {
              "1": 0,
              "2": 0,
              "3": 1,
            },
          },
          years: 7,
          months: 75,
          days: 2261,
          daysInYear: {
            "1995": 365,
            "1996": 366,
            "1997": 365,
            "1998": 365,
            "1999": 365,
            "2000": 366,
            "2001": 69,
          },
          daysInYearMonth: {
            "1995": {
              "1": 31,
              "10": 31,
              "11": 30,
              "12": 31,
              "2": 28,
              "3": 31,
              "4": 30,
              "5": 31,
              "6": 30,
              "7": 31,
              "8": 31,
              "9": 30,
            },
            "1996": {
              "1": 31,
              "10": 31,
              "11": 30,
              "12": 31,
              "2": 29,
              "3": 31,
              "4": 30,
              "5": 31,
              "6": 30,
              "7": 31,
              "8": 31,
              "9": 30,
            },
            "1997": {
              "1": 31,
              "10": 31,
              "11": 30,
              "12": 31,
              "2": 28,
              "3": 31,
              "4": 30,
              "5": 31,
              "6": 30,
              "7": 31,
              "8": 31,
              "9": 30,
            },
            "1998": {
              "1": 31,
              "10": 31,
              "11": 30,
              "12": 31,
              "2": 28,
              "3": 31,
              "4": 30,
              "5": 31,
              "6": 30,
              "7": 31,
              "8": 31,
              "9": 30,
            },
            "1999": {
              "1": 31,
              "10": 31,
              "11": 30,
              "12": 31,
              "2": 28,
              "3": 31,
              "4": 30,
              "5": 31,
              "6": 30,
              "7": 31,
              "8": 31,
              "9": 30,
            },
            "2000": {
              "1": 31,
              "10": 31,
              "11": 30,
              "12": 31,
              "2": 29,
              "3": 31,
              "4": 30,
              "5": 31,
              "6": 30,
              "7": 31,
              "8": 31,
              "9": 30,
            },
            "2001": {
              "1": 31,
              "2": 28,
              "3": 10,
            },
          },
          maxDate: {
            day: 10,
            month: 3,
            year: 2001,
          },
          minDate: {
            day: 1,
            month: 1,
            year: 1995,
          },
        },
        total: 2,
      },
    }));
});
describe("collectTopics", () => {
  const mockT = jest.fn((x) => x);
  const mockCountryData = {
    isValid: jest.fn((country) => country === "jp"),
    getName: jest.fn(() => "Japan"),
  };
  const mockTheme = {
    get: jest.fn(() => "#000"),
  };
  test("Empty", () => {
    const topics = stats.collectTopics(
      {
        count: {
          byAuthor: {
            "Author One": 2,
          },
          byCountry: {
            jp: 2,
          },
          byExposure: {
            byAperture: {
              "2.8": 2,
            },
            byExposureTime: {
              "0.01": 2,
            },
            byExposureValue: {
              "9.5": 2,
            },
            byFocalLength: {
              "23": 2,
            },
            byIso: {
              "100": 2,
            },
            byLightValue: {
              "9.5": 2,
            },
            byResolution: {
              "6": 2,
            },
            byOrientation: {
              landscape: 2,
            },
          },
          byGear: {
            byCamera: {
              "CMake CModel": 2,
            },
            byCameraLens: {
              '["CMake CModel","LMake LModel"]': 2,
            },
            byCameraMake: {
              CMake: 2,
            },
            byLens: {
              "LMake LModel": 2,
            },
          },
          byTime: {
            byHour: {
              "0": 0,
              "1": 0,
              "10": 0,
              "11": 0,
              "12": 0,
              "13": 2,
              "14": 0,
              "15": 0,
              "16": 0,
              "17": 0,
              "18": 0,
              "19": 0,
              "2": 0,
              "20": 0,
              "21": 0,
              "22": 0,
              "23": 0,
              "3": 0,
              "4": 0,
              "5": 0,
              "6": 0,
              "7": 0,
              "8": 0,
              "9": 0,
            },
            byMonth: {
              "1": 1,
              "2": 0,
              "3": 1,
              "4": 0,
              "5": 0,
              "6": 0,
              "7": 0,
              "8": 0,
              "9": 0,
              "10": 0,
              "11": 0,
              "12": 0,
            },
            byWeekday: {
              "0": 1,
              "1": 0,
              "2": 0,
              "3": 0,
              "4": 0,
              "5": 0,
              "6": 1,
            },
            byYear: {
              "1995": 1,
              "1996": 0,
              "1997": 0,
              "1998": 0,
              "1999": 0,
              "2000": 0,
              "2001": 1,
            },
            byYearMonth: {
              "1995": {
                "1": 1,
                "2": 0,
                "3": 0,
                "4": 0,
                "5": 0,
                "6": 0,
                "7": 0,
                "8": 0,
                "9": 0,
                "10": 0,
                "11": 0,
                "12": 0,
              },
              "1996": {
                "1": 0,
                "2": 0,
                "3": 0,
                "4": 0,
                "5": 0,
                "6": 0,
                "7": 0,
                "8": 0,
                "9": 0,
                "10": 0,
                "11": 0,
                "12": 0,
              },
              "1997": {
                "1": 0,
                "2": 0,
                "3": 0,
                "4": 0,
                "5": 0,
                "6": 0,
                "7": 0,
                "8": 0,
                "9": 0,
                "10": 0,
                "11": 0,
                "12": 0,
              },
              "1998": {
                "1": 0,
                "2": 0,
                "3": 0,
                "4": 0,
                "5": 0,
                "6": 0,
                "7": 0,
                "8": 0,
                "9": 0,
                "10": 0,
                "11": 0,
                "12": 0,
              },
              "1999": {
                "1": 0,
                "2": 0,
                "3": 0,
                "4": 0,
                "5": 0,
                "6": 0,
                "7": 0,
                "8": 0,
                "9": 0,
                "10": 0,
                "11": 0,
                "12": 0,
              },
              "2000": {
                "1": 0,
                "2": 0,
                "3": 0,
                "4": 0,
                "5": 0,
                "6": 0,
                "7": 0,
                "8": 0,
                "9": 0,
                "10": 0,
                "11": 0,
                "12": 0,
              },
              "2001": {
                "1": 0,
                "2": 0,
                "3": 1,
              },
            },
            years: 7,
            months: 75,
            days: 2261,
            daysInYear: {
              "1995": 365,
              "1996": 366,
              "1997": 365,
              "1998": 365,
              "1999": 365,
              "2000": 366,
              "2001": 69,
            },
            daysInYearMonth: {
              "1995": {
                "1": 31,
                "10": 31,
                "11": 30,
                "12": 31,
                "2": 28,
                "3": 31,
                "4": 30,
                "5": 31,
                "6": 30,
                "7": 31,
                "8": 31,
                "9": 30,
              },
              "1996": {
                "1": 31,
                "10": 31,
                "11": 30,
                "12": 31,
                "2": 29,
                "3": 31,
                "4": 30,
                "5": 31,
                "6": 30,
                "7": 31,
                "8": 31,
                "9": 30,
              },
              "1997": {
                "1": 31,
                "10": 31,
                "11": 30,
                "12": 31,
                "2": 28,
                "3": 31,
                "4": 30,
                "5": 31,
                "6": 30,
                "7": 31,
                "8": 31,
                "9": 30,
              },
              "1998": {
                "1": 31,
                "10": 31,
                "11": 30,
                "12": 31,
                "2": 28,
                "3": 31,
                "4": 30,
                "5": 31,
                "6": 30,
                "7": 31,
                "8": 31,
                "9": 30,
              },
              "1999": {
                "1": 31,
                "10": 31,
                "11": 30,
                "12": 31,
                "2": 28,
                "3": 31,
                "4": 30,
                "5": 31,
                "6": 30,
                "7": 31,
                "8": 31,
                "9": 30,
              },
              "2000": {
                "1": 31,
                "10": 31,
                "11": 30,
                "12": 31,
                "2": 29,
                "3": 31,
                "4": 30,
                "5": 31,
                "6": 30,
                "7": 31,
                "8": 31,
                "9": 30,
              },
              "2001": {
                "1": 31,
                "2": 28,
                "3": 10,
              },
            },
            maxDate: {
              day: 10,
              month: 3,
              year: 2001,
            },
            minDate: {
              day: 1,
              month: 1,
              year: 1995,
            },
          },
          total: 2,
        },
      },
      "en",
      mockT,
      mockCountryData,
      mockTheme
    );
    expect(topics.length).toBe(4);
    expect(topics[0].key).toBe("general");
    expect(topics[0].title).toBe("stats-topic-general");
    expect(topics[0].categories.length).toBe(3);
    expect(topics[0].categories[0]).toStrictEqual({
      key: "summary",
      title: "stats-category-summary",
      kpi: [
        { key: "photos", value: "2" },
        { key: "average", value: "0.00" },
        { key: "years", value: "7" },
        { key: "months", value: "75" },
        { key: "days", value: "2,261" },
      ],
    });
    expect(topics[0].categories[1].key).toBe("author");
    expect(topics[0].categories[1].title).toBe("stats-category-author");
    expect(topics[0].categories[1].charts.length).toBe(2);
    expect(topics[0].categories[1].tableColumns).toStrictEqual([
      { title: "rank", align: "right", header: true },
      { title: "author", align: "left" },
      { title: "count", align: "right" },
      { title: "share", align: "right" },
    ]);
    expect(topics[0].categories[1].table).toStrictEqual([
      {
        key: '{"value":"Author One","isUnknown":false}',
        rank: "1",
        author: "Author One",
        count: "2",
        share: "100.0%",
        standardScore: NaN,
      },
    ]);
    expect(topics[0].categories[2].key).toBe("country");
    expect(topics[0].categories[2].title).toBe("stats-category-country");
    expect(topics[0].categories[2].charts.length).toBe(2);
    expect(topics[0].categories[2].tableColumns).toStrictEqual([
      { title: "rank", align: "right", header: true },
      { title: "flag", align: "right", header: true },
      { title: "country", align: "left" },
      { title: "count", align: "right" },
      { title: "share", align: "right" },
    ]);
    delete topics[0].categories[2].table[0].flag;
    delete topics[0].categories[2].table[0].country;
    expect(topics[0].categories[2].table).toStrictEqual([
      {
        key: '{"value":"jp","isUnknown":false}',
        rank: "1",
        count: "2",
        share: "100.0%",
        standardScore: NaN,
      },
    ]);
    expect(topics[1].key).toBe("time");
    expect(topics[1].title).toBe("stats-topic-time");
    expect(topics[1].categories.length).toBe(5);
    expect(topics[2].key).toBe("gear");
    expect(topics[2].title).toBe("stats-topic-gear");
    expect(topics[2].categories.length).toBe(4);
    expect(topics[3].key).toBe("exposure");
    expect(topics[3].title).toBe("stats-topic-exposure");
    expect(topics[3].categories.length).toBe(8);
  });
});
