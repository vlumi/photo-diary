import stats from "./stats";

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
describe("collectTopics", () => {
  const mockT = ((x: any) => x) as any;
  const mockCountryData = {
    isValid: (country: any) => country === "jp",
    getName: () => "Japan",
  };
  const mockTheme = {
    get: () => "#000",
  };
  const baseData = (): any => ({
        count: {
          byAuthor: {
            "Author One": 2,
          },
          byCountry: {
            jp: 2,
          },
          byExposure: {
            byAperture: {
              2.8: 2,
            },
            byAspectRatio: {
              "3:2": 2,
            },
            byExposureTime: {
              0.01: 2,
            },
            byExposureValue: {
              9.5: 2,
            },
            byFocalLength: {
              23: 2,
            },
            byFocalLength35mmEquiv: {
              unknown: 2,
            },
            byIso: {
              100: 2,
            },
            byLightValue: {
              9.5: 2,
            },
            byResolution: {
              6: 2,
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
              0: 0,
              1: 0,
              10: 0,
              11: 0,
              12: 0,
              13: 2,
              14: 0,
              15: 0,
              16: 0,
              17: 0,
              18: 0,
              19: 0,
              2: 0,
              20: 0,
              21: 0,
              22: 0,
              23: 0,
              3: 0,
              4: 0,
              5: 0,
              6: 0,
              7: 0,
              8: 0,
              9: 0,
            },
            byMonth: {
              1: 1,
              2: 0,
              3: 1,
              4: 0,
              5: 0,
              6: 0,
              7: 0,
              8: 0,
              9: 0,
              10: 0,
              11: 0,
              12: 0,
            },
            byWeekday: {
              0: 1,
              1: 0,
              2: 0,
              3: 0,
              4: 0,
              5: 0,
              6: 1,
            },
            byYear: {
              1995: 1,
              1996: 0,
              1997: 0,
              1998: 0,
              1999: 0,
              2000: 0,
              2001: 1,
            },
            byYearMonth: {
              1995: {
                1: 1,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                6: 0,
                7: 0,
                8: 0,
                9: 0,
                10: 0,
                11: 0,
                12: 0,
              },
              1996: {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                6: 0,
                7: 0,
                8: 0,
                9: 0,
                10: 0,
                11: 0,
                12: 0,
              },
              1997: {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                6: 0,
                7: 0,
                8: 0,
                9: 0,
                10: 0,
                11: 0,
                12: 0,
              },
              1998: {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                6: 0,
                7: 0,
                8: 0,
                9: 0,
                10: 0,
                11: 0,
                12: 0,
              },
              1999: {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                6: 0,
                7: 0,
                8: 0,
                9: 0,
                10: 0,
                11: 0,
                12: 0,
              },
              2000: {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
                5: 0,
                6: 0,
                7: 0,
                8: 0,
                9: 0,
                10: 0,
                11: 0,
                12: 0,
              },
              2001: {
                1: 0,
                2: 0,
                3: 1,
              },
            },
            years: 6.2,
            months: 74.3,
            days: 2261,
            daysInYear: {
              1995: 365,
              1996: 366,
              1997: 365,
              1998: 365,
              1999: 365,
              2000: 366,
              2001: 69,
            },
            daysInYearMonth: {
              1995: {
                1: 31,
                10: 31,
                11: 30,
                12: 31,
                2: 28,
                3: 31,
                4: 30,
                5: 31,
                6: 30,
                7: 31,
                8: 31,
                9: 30,
              },
              1996: {
                1: 31,
                10: 31,
                11: 30,
                12: 31,
                2: 29,
                3: 31,
                4: 30,
                5: 31,
                6: 30,
                7: 31,
                8: 31,
                9: 30,
              },
              1997: {
                1: 31,
                10: 31,
                11: 30,
                12: 31,
                2: 28,
                3: 31,
                4: 30,
                5: 31,
                6: 30,
                7: 31,
                8: 31,
                9: 30,
              },
              1998: {
                1: 31,
                10: 31,
                11: 30,
                12: 31,
                2: 28,
                3: 31,
                4: 30,
                5: 31,
                6: 30,
                7: 31,
                8: 31,
                9: 30,
              },
              1999: {
                1: 31,
                10: 31,
                11: 30,
                12: 31,
                2: 28,
                3: 31,
                4: 30,
                5: 31,
                6: 30,
                7: 31,
                8: 31,
                9: 30,
              },
              2000: {
                1: 31,
                10: 31,
                11: 30,
                12: 31,
                2: 29,
                3: 31,
                4: 30,
                5: 31,
                6: 30,
                7: 31,
                8: 31,
                9: 30,
              },
              2001: {
                1: 31,
                2: 28,
                3: 10,
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
      });

  test("Empty", () => {
    const topics = stats.collectTopics(
      baseData(),
      "en",
      mockT,
      mockCountryData,
      mockTheme
    );
    expect(topics.length).toBe(6);
    expect(topics[0].key).toBe("general");
    expect(topics[0].title).toBe("stats-topic-general");
    expect(topics[0].categories.length).toBe(3);
    // `toMatchObject` so the new `summaryExtras` field (for the
    // expanded Summary modal) doesn't have to be re-asserted in
    // every test — the existing assertion covers the inline KPIs.
    expect(topics[0].categories[0]).toMatchObject({
      key: "summary",
      title: "stats-category-summary",
      kpi: [
        { key: "photos", value: "2" },
        { key: "average", value: "0.00" },
        { key: "years", value: "6.2" },
        { key: "months", value: "74.3" },
        { key: "days", value: "2,261" },
      ],
    });
    expect(topics[0].categories[1].key).toBe("author");
    expect(topics[0].categories[1].title).toBe("stats-category-author");
    expect(topics[0].categories[1].charts!.length).toBe(2);
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
        _count: 2,
        standardScore: NaN,
      },
    ]);
    expect(topics[0].categories[2].key).toBe("country");
    expect(topics[0].categories[2].title).toBe("stats-category-country");
    expect(topics[0].categories[2].charts!.length).toBe(2);
    expect(topics[0].categories[2].tableColumns).toStrictEqual([
      { title: "rank", align: "right", header: true },
      { title: "flag", align: "right", header: true },
      { title: "country", align: "left" },
      { title: "count", align: "right" },
      { title: "share", align: "right" },
    ]);
    delete topics[0].categories[2].table![0].flag;
    delete topics[0].categories[2].table![0].country;
    expect(topics[0].categories[2].table).toStrictEqual([
      {
        key: '{"value":"jp","isUnknown":false}',
        rank: "1",
        count: "2",
        share: "100.0%",
        _count: 2,
        _label: "Japan",
        standardScore: NaN,
      },
    ]);
    expect(topics[1].key).toBe("time");
    expect(topics[1].title).toBe("stats-topic-time");
    expect(topics[1].categories.length).toBe(5);
    expect(topics[2].key).toBe("gear");
    expect(topics[2].title).toBe("stats-topic-gear");
    expect(topics[2].categories.length).toBe(4);
    expect(topics[3].key).toBe("settings");
    expect(topics[3].title).toBe("stats-topic-settings");
    expect(topics[3].categories.length).toBe(4);
    expect(topics[4].key).toBe("image");
    expect(topics[4].title).toBe("stats-topic-image");
    expect(topics[4].categories.length).toBe(3);
    expect(topics[5].key).toBe("light");
    expect(topics[5].title).toBe("stats-topic-light");
    expect(topics[5].categories.length).toBe(2);
  });

  test("With geotaggedCount > 0 appends location category to general", () => {
    const mapPhotos = [{}, {}, {}] as any[];
    const data = baseData();
    data.count.geotaggedCount = 3;
    const topics = stats.collectTopics(
      data,
      "en",
      mockT,
      mockCountryData,
      mockTheme,
      mapPhotos
    );
    expect(topics[0].key).toBe("general");
    expect(topics[0].categories.length).toBe(4);
    expect(topics[0].categories[3]).toMatchObject({
      key: "location",
      title: "stats-category-location",
      kind: "location",
      geotaggedCount: 3,
      totalCount: 2,
    });
    // photos array is still propagated for the MapModal once
    // the parent's lazy fetch populates it.
    expect((topics[0].categories[3] as any).photos).toBe(mapPhotos);
  });

  test("geotaggedCount=0 does not emit location category", () => {
    const data = baseData();
    data.count.geotaggedCount = 0;
    const topics = stats.collectTopics(
      data,
      "en",
      mockT,
      mockCountryData,
      mockTheme,
      []
    );
    expect(topics[0].categories.length).toBe(3);
    expect(
      topics[0].categories.find((c) => c.key === "location")
    ).toBeUndefined();
  });
});
