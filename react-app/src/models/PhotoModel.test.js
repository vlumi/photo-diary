import PhotoModel from "./PhotoModel";

describe("Constructor", () => {
  let template;
  beforeEach(
    () =>
      (template = {
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
      })
  );
  test("Undefined", () => expect(PhotoModel(undefined)).toBeUndefined());
  test("No ID", () => {
    delete template.id;
    expect(PhotoModel(template)).toBeUndefined();
  });
  test("No index", () => {
    delete template.index;
    expect(PhotoModel(template)).toBeUndefined();
  });
  test("Non-numeric index", () => {
    template.index = "";
    expect(PhotoModel(template)).toBeUndefined();
  });
  test("Negative index", () => {
    template.index = -1;
    expect(PhotoModel(template)).toBeUndefined();
  });
  test("No taken", () => {
    delete template.taken;
    expect(PhotoModel(template)).toBeUndefined();
  });
  test("No instant", () => {
    delete template.taken.instant;
    expect(PhotoModel(template)).toBeUndefined();
  });
  test("No year", () => {
    delete template.taken.instant.year;
    expect(PhotoModel(template)).toBeUndefined();
  });
  test("No month", () => {
    delete template.taken.instant.month;
    expect(PhotoModel(template)).toBeUndefined();
  });
  test("No day", () => {
    delete template.taken.instant.day;
    expect(PhotoModel(template)).toBeUndefined();
  });
  test("No dimensions", () => {
    delete template.dimensions;
    expect(PhotoModel(template)).toBeUndefined();
  });
  test("No original dimensions", () => {
    delete template.dimensions.original;
    expect(PhotoModel(template)).toBeUndefined();
  });
  test("No display dimensions", () => {
    delete template.dimensions.display;
    expect(PhotoModel(template)).toBeUndefined();
  });
  test("No thumbnail dimensions", () => {
    delete template.dimensions.thumbnail;
    expect(PhotoModel(template)).toBeUndefined();
  });
});
describe("With samples", () => {
  let samples;
  beforeAll(() => {
    samples = {
      "empty.jpg": PhotoModel({
        id: "empty.jpg",
        index: 0,
        title: "",
        description: "",
        taken: {
          instant: {
            timestamp: "2019-01-01 13:00:15",
            year: 2019,
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
      "1.jpg": PhotoModel({
        id: "1.jpg",
        index: 1,
        title: "Some title",
        description: "Some description",
        taken: {
          instant: {
            timestamp: "2020-02-29 14:01:16",
            year: 2020,
            month: 2,
            day: 29,
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
      "justmake.jpg": PhotoModel({
        id: "justmake.jpg",
        index: 2,
        title: "Some title",
        description: "Some description",
        taken: {
          instant: {
            timestamp: "2020-01-01 14:01:16",
            year: 2020,
            month: 2,
            day: 29,
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
        camera: { make: "CMake" },
        lens: { make: "LMake" },
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
      "justmodel.jpg": PhotoModel({
        id: "justmodel.jpg",
        index: 2,
        title: "Some title",
        description: "Some description",
        taken: {
          instant: {
            timestamp: "2020-01-01 14:01:16",
            year: 2020,
            month: 2,
            day: 29,
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
        camera: { model: "CModel" },
        lens: { model: "LModel" },
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
  });

  // General
  describe("id", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].id()).toBe("empty.jpg"));
    test("1.jpg", () => expect(samples["1.jpg"].id()).toBe("1.jpg"));
  });
  describe("index", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].index()).toBe(0));
    test("1.jpg", () => expect(samples["1.jpg"].index()).toBe(1));
  });
  describe("title", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].title()).toBe(""));
    test("1.jpg", () => expect(samples["1.jpg"].title()).toBe("Some title"));
  });
  describe("description", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].description()).toBe(""));
    test("1.jpg", () =>
      expect(samples["1.jpg"].description()).toBe("Some description"));
  });
  describe("author", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].author()).toBe(null));
    test("1.jpg", () => expect(samples["1.jpg"].author()).toBe("Author One"));
  });
  // Time
  describe("ymd", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].ymd()).toStrictEqual([2019, 1, 1]));
    test("1.jpg", () =>
      expect(samples["1.jpg"].ymd()).toStrictEqual([2020, 2, 29]));
  });
  describe("year", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].year()).toBe(2019));
    test("1.jpg", () => expect(samples["1.jpg"].year()).toBe(2020));
  });
  describe("month", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].month()).toBe(1));
    test("1.jpg", () => expect(samples["1.jpg"].month()).toBe(2));
  });
  describe("day", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].day()).toBe(1));
    test("1.jpg", () => expect(samples["1.jpg"].day()).toBe(29));
  });
  describe("weekday", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].weekday()).toBe(2));
    test("1.jpg", () => expect(samples["1.jpg"].weekday()).toBe(6));
  });
  describe("hour", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].hour()).toBe(13));
    test("1.jpg", () => expect(samples["1.jpg"].hour()).toBe(14));
  });
  describe("minute", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].minute()).toBe(0));
    test("1.jpg", () => expect(samples["1.jpg"].minute()).toBe(1));
  });
  describe("second", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].second()).toBe(15));
    test("1.jpg", () => expect(samples["1.jpg"].second()).toBe(16));
  });
  describe("formatDate", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].formatDate()).toBe("2019-01-01"));
    test("1.jpg", () =>
      expect(samples["1.jpg"].formatDate()).toBe("2020-02-29"));
  });
  describe("formatTimestamp", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].formatTimestamp()).toBe(
        "2019-01-01 13:00:15"
      ));
    test("1.jpg", () =>
      expect(samples["1.jpg"].formatTimestamp()).toBe("2020-02-29 14:01:16"));
  });
  // File
  describe("thumbnailDimensions", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].thumbnailDimensions()).toStrictEqual({
        width: 300,
        height: 200,
      }));
    test("1.jpg", () =>
      expect(samples["1.jpg"].thumbnailDimensions()).toStrictEqual({
        width: 200,
        height: 300,
      }));
  });
  describe("ratio", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].ratio()).toBe(1.5));
    test("1.jpg", () => expect(samples["1.jpg"].ratio()).toBe(2 / 3));
  });
  // Exposure
  describe("focalLength", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].focalLength()).toBe(null));
    test("1.jpg", () => expect(samples["1.jpg"].focalLength()).toBe(23));
  });
  describe("aperture", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].aperture()).toBe(null));
    test("1.jpg", () => expect(samples["1.jpg"].aperture()).toBe(2.8));
  });
  describe("exposureTime", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].exposureTime()).toBe(null));
    test("1.jpg", () => expect(samples["1.jpg"].exposureTime()).toBe(0.01));
  });
  describe("iso", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].iso()).toBe(null));
    test("1.jpg", () => expect(samples["1.jpg"].iso()).toBe(100));
  });
  describe("exposureValue", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].exposureValue()).toBe(undefined));
    test("1.jpg", () => expect(samples["1.jpg"].exposureValue()).toBe(9.5));
  });
  describe("lightValue", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].lightValue()).toBe(undefined));
    test("1.jpg", () => expect(samples["1.jpg"].lightValue()).toBe(9.5));
  });
  describe("resolution", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].resolution()).toBe(0));
    test("1.jpg", () => expect(samples["1.jpg"].resolution()).toBe(6));
  });
  // Gear
  describe("cameraMake", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].cameraMake()).toBe(undefined));
    test("1.jpg", () => expect(samples["1.jpg"].cameraMake()).toBe("CMake"));
  });
  describe("hasCamera", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].hasCamera()).toBe(false));
    test("1.jpg", () => expect(samples["1.jpg"].hasCamera()).toBe(true));
    test("justmake.jpg", () =>
      expect(samples["justmake.jpg"].hasCamera()).toBe(true));
    test("justmodel.jpg", () =>
      expect(samples["justmodel.jpg"].hasCamera()).toBe(true));
  });
  describe("formatCamera", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].formatCamera()).toBe(undefined));
    test("1.jpg", () =>
      expect(samples["1.jpg"].formatCamera()).toBe("CMake CModel"));
    test("justmake.jpg", () =>
      expect(samples["justmake.jpg"].formatCamera()).toBe("CMake"));
    test("justmodel.jpg", () =>
      expect(samples["justmodel.jpg"].formatCamera()).toBe("CModel"));
  });
  describe("hasLens", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].hasLens()).toBe(false));
    test("1.jpg", () => expect(samples["1.jpg"].hasLens()).toBe(true));
    test("justmake.jpg", () =>
      expect(samples["justmake.jpg"].hasLens()).toBe(true));
    test("justmodel.jpg", () =>
      expect(samples["justmodel.jpg"].hasLens()).toBe(true));
  });
  describe("formatLens", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].formatLens()).toBe(undefined));
    test("1.jpg", () =>
      expect(samples["1.jpg"].formatLens()).toBe("LMake LModel"));
    test("justmake.jpg", () =>
      expect(samples["justmake.jpg"].formatLens()).toBe("LMake"));
    test("justmodel.jpg", () =>
      expect(samples["justmodel.jpg"].formatLens()).toBe("LModel"));
  });
  describe("formatGear", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].formatGear()).toBe(""));
    test("1.jpg", () =>
      expect(samples["1.jpg"].formatGear()).toBe(
        "CMake CModel + LMake LModel"
      ));
    test("justmake.jpg", () =>
      expect(samples["justmake.jpg"].formatGear()).toBe("CMake + LMake"));
    test("justmodel.jpg", () =>
      expect(samples["justmodel.jpg"].formatGear()).toBe("CModel + LModel"));
  });
  // Location
  describe("hasCountry", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].hasCountry()).toBe(false));
    test("1.jpg", () => expect(samples["1.jpg"].hasCountry()).toBe(true));
  });
  describe("countryCode", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].countryCode()).toBe(null));
    test("1.jpg", () => expect(samples["1.jpg"].countryCode()).toBe("jp"));
  });
  describe("countryName", () => {
    test("empty.jpg", () =>
      expect(
        samples["empty.jpg"].countryName("en", {
          getName: (code) => {
            if (code === "jp") return "Japan";
            return "???";
          },
        })
      ).toBe(""));
    test("1.jpg", () =>
      expect(
        samples["1.jpg"].countryName("en", {
          getName: (code) => {
            if (code === "jp") return "Japan";
            return "???";
          },
        })
      ).toBe("Japan"));
  });
  describe("hasPlace", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].hasPlace()).toBe(false));
    test("1.jpg", () => expect(samples["1.jpg"].hasPlace()).toBe(true));
  });
  describe("place", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].place()).toBe(null));
    test("1.jpg", () => expect(samples["1.jpg"].place()).toBe("Some place"));
  });
  describe("hasCoordinates", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].hasCoordinates()).toBe(false));
    test("1.jpg", () => expect(samples["1.jpg"].hasCoordinates()).toBe(true));
  });
  describe("coordinates", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].coordinates()).toStrictEqual(["", ""]));
    test("1.jpg", () =>
      expect(samples["1.jpg"].coordinates()).toStrictEqual([30, -30]));
  });
  describe("latitude", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].latitude()).toBe(""));
    test("1.jpg", () => expect(samples["1.jpg"].latitude()).toBe(30));
  });
  describe("longitude", () => {
    test("empty.jpg", () => expect(samples["empty.jpg"].longitude()).toBe(""));
    test("1.jpg", () => expect(samples["1.jpg"].longitude()).toBe(-30));
  });
  describe("formatCoordinates", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].formatCoordinates()).toBe(""));
    test("1.jpg", () =>
      expect(samples["1.jpg"].formatCoordinates()).toBe("30°0′0″N 30°0′0″W"));
  });

  describe("path", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].path({ path: () => "/g/gallery" })).toBe(
        "/g/gallery/empty.jpg"
      ));
    test("1.jpg", () =>
      expect(samples["1.jpg"].path({ path: () => "/g/gallery" })).toBe(
        "/g/gallery/1.jpg"
      ));
  });

  describe("matches", () => {
    describe("author", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("author", null)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("author", null)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("author", "Author One")).toBe(
          false
        ));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("author", "Author One")).toBe(true));
    });
    describe("country", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("country", null)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("country", null)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("country", "jp")).toBe(false));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("country", "jp")).toBe(true));
    });
    describe("year", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("year", 2019)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("year", 2019)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("year", 2020)).toBe(false));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("year", 2020)).toBe(true));
    });
    describe("year-month", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("year-month", "2019-1")).toBe(
          true
        ));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("year-month", "2019-1")).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("year-month", "2020-2")).toBe(
          false
        ));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("year-month", "2020-2")).toBe(true));
    });
    describe("month", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("month", 1)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("month", 1)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("month", 2)).toBe(false));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("month", 2)).toBe(true));
    });
    describe("weekday", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("weekday", 2)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("weekday", 2)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("weekday", 6)).toBe(false));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("weekday", 6)).toBe(true));
    });
    describe("hour", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("hour", 13)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("hour", 13)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("hour", 14)).toBe(false));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("hour", 14)).toBe(true));
    });
    describe("camera-make", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("camera-make", undefined)).toBe(
          true
        ));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("camera-make", undefined)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("camera-make", "CMake")).toBe(
          false
        ));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("camera-make", "CMake")).toBe(true));
    });
    describe("camera", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("camera", undefined)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("camera", undefined)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("camera", "CMake CModel")).toBe(
          false
        ));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("camera", "CMake CModel")).toBe(true));
    });
    describe("lens", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("lens", undefined)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("lens", undefined)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("lens", "LMake LModel")).toBe(
          false
        ));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("lens", "LMake LModel")).toBe(true));
    });
    describe("camera-lens", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("camera-lens", "[null,null]")).toBe(
          true
        ));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("camera-lens", "[null,null]")).toBe(
          false
        ));
      test("empty.jpg", () =>
        expect(
          samples["empty.jpg"].matches(
            "camera-lens",
            '["CMake CModel","LMake LModel"]'
          )
        ).toBe(false));
      test("1.jpg", () =>
        expect(
          samples["1.jpg"].matches(
            "camera-lens",
            '["CMake CModel","LMake LModel"]'
          )
        ).toBe(true));
    });
    describe("focal-length", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("focal-length", null)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("focal-length", null)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("focal-length", 23)).toBe(false));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("focal-length", 23)).toBe(true));
    });
    describe("aperture", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("aperture", null)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("aperture", null)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("aperture", 2.8)).toBe(false));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("aperture", 2.8)).toBe(true));
    });
    describe("exposure-time", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("exposure-time", null)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("exposure-time", null)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("exposure-time", 0.01)).toBe(
          false
        ));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("exposure-time", 0.01)).toBe(true));
    });
    describe("iso", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("iso", null)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("iso", null)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("iso", 100)).toBe(false));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("iso", 100)).toBe(true));
    });
    describe("ev", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("ev", undefined)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("ev", undefined)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("ev", 9.5)).toBe(false));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("ev", 9.5)).toBe(true));
    });
    describe("lv", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("lv", undefined)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("lv", undefined)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("lv", 9.5)).toBe(false));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("lv", 9.5)).toBe(true));
    });
    describe("resolution", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("resolution", 0)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("resolution", 0)).toBe(false));
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("resolution", 6)).toBe(false));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("resolution", 6)).toBe(true));
    });
    describe("dummy", () => {
      test("empty.jpg", () =>
        expect(samples["empty.jpg"].matches("dummy", 0)).toBe(true));
      test("1.jpg", () =>
        expect(samples["1.jpg"].matches("dummy", 0)).toBe(true));
    });
  });
  describe("uniqueValues", () => {
    test("empty.jpg", () =>
      expect(samples["empty.jpg"].uniqueValues()).toStrictEqual({
        exposure: {
          aperture: new Set([null]),
          ev: new Set([undefined]),
          "exposure-time": new Set([null]),
          "focal-length": new Set([null]),
          iso: new Set([null]),
          lv: new Set([undefined]),
          resolution: new Set([0]),
        },
        gear: {
          camera: new Set([undefined]),
          "camera-lens": new Set(["[null,null]"]),
          "camera-make": new Set([undefined]),
          lens: new Set([undefined]),
        },
        general: { author: new Set([null]), country: new Set([null]) },
        time: {
          hour: new Set([13]),
          month: new Set([1]),
          weekday: new Set([2]),
          year: new Set([2019]),
          "year-month": new Set(["2019-1"]),
        },
      }));
    test("1.jpg", () =>
      expect(samples["1.jpg"].uniqueValues()).toStrictEqual({
        exposure: {
          aperture: new Set([2.8]),
          ev: new Set([9.5]),
          "exposure-time": new Set([0.01]),
          "focal-length": new Set([23]),
          iso: new Set([100]),
          lv: new Set([9.5]),
          resolution: new Set([6]),
        },
        gear: {
          camera: new Set(["CMake CModel"]),
          "camera-lens": new Set(['["CMake CModel","LMake LModel"]']),
          "camera-make": new Set(["CMake"]),
          lens: new Set(["LMake LModel"]),
        },
        general: { author: new Set(["Author One"]), country: new Set(["jp"]) },
        time: {
          hour: new Set([14]),
          month: new Set([2]),
          weekday: new Set([6]),
          year: new Set([2020]),
          "year-month": new Set(["2020-2"]),
        },
      }));
  });
});
