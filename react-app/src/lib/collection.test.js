import collection from "./collection";

describe("joinTruthyKeys()", () => {
  test("Empty", () => expect(collection.joinTruthyKeys({})).toBe(""));
  test("Only true", () =>
    expect(collection.joinTruthyKeys({ yes: true })).toBe("yes"));
  test("True and false", () =>
    expect(collection.joinTruthyKeys({ yes: true, no: false })).toBe("yes"));
  test("Double true and false", () =>
    expect(
      collection.joinTruthyKeys({ yes: true, again: true, no: false })
    ).toBe("yes again"));
  test("Double true and false, with separator", () =>
    expect(
      collection.joinTruthyKeys({ yes: true, again: true, no: false }, "/")
    ).toBe("yes/again"));
});
describe("compareArrays()", () => {
  test("Undefined", () =>
    expect(collection.compareArrays(undefined, undefined)).toBe(undefined));
  test("Undefined left", () =>
    expect(collection.compareArrays(undefined, [])).toBe(undefined));
  test("Undefined right", () =>
    expect(collection.compareArrays([], undefined)).toBe(undefined));
  test("Empty === Empty", () =>
    expect(collection.compareArrays([], [])).toBe(0));
  test("Empty < Any", () => expect(collection.compareArrays([], [1])).toBe(-1));
  test("Any > Empty", () => expect(collection.compareArrays([1], [])).toBe(1));
  test("[1] === [1]", () => expect(collection.compareArrays([1], [1])).toBe(0));
  test("[1] < [2]", () => expect(collection.compareArrays([1], [2])).toBe(-1));
  test("[2] > [1]", () => expect(collection.compareArrays([2], [1])).toBe(1));
  test("[1,1] === [1,1]", () =>
    expect(collection.compareArrays([1, 1], [1, 1])).toBe(0));
  test("[1,1] < [1,2]", () =>
    expect(collection.compareArrays([1, 1], [1, 2])).toBe(-1));
  test("[1,2] > [1,1]", () =>
    expect(collection.compareArrays([1, 2], [1, 1])).toBe(1));
  test("[1] < [1,1]", () =>
    expect(collection.compareArrays([1], [1, 1])).toBe(-1));
  test("[1,1] > [1]", () =>
    expect(collection.compareArrays([1, 1], [1])).toBe(1));
});
describe("transformObjectKeys()", () => {
  const transformer = (key, value) => {
    return [`${key}_`, value];
  };
  test("Undefined", () =>
    expect(
      collection.transformObjectKeys(undefined, transformer)
    ).toStrictEqual(undefined));
  test("Empty", () =>
    expect(collection.transformObjectKeys({}, transformer)).toStrictEqual({}));
  test("One key", () =>
    expect(
      collection.transformObjectKeys({ key: 1 }, transformer)
    ).toStrictEqual({ key_: 1 }));
  test("Two key", () =>
    expect(
      collection.transformObjectKeys({ key: 1, other: 2 }, transformer)
    ).toStrictEqual({ key_: 1, other_: 2 }));
});
describe("transformObjectValue()", () => {
  const transformer = (_) => _.key + 1;
  test("Undefined", () =>
    expect(
      collection.transformObjectValue(undefined, "key", transformer)
    ).toStrictEqual(undefined));
  test("Empty", () =>
    expect(
      collection.transformObjectValue({}, "key", transformer)
    ).toStrictEqual({}));
  test("No other keys", () =>
    expect(
      collection.transformObjectValue({ key: 1 }, "key", transformer)
    ).toStrictEqual({ key: 2 }));
  test("Some other key", () =>
    expect(
      collection.transformObjectValue({ other: 1, key: 1 }, "key", transformer)
    ).toStrictEqual({ other: 1, key: 2 }));
});
describe("trim()", () => {
  test("Undefined", () => expect(collection.trim(undefined)).toStrictEqual([]));
  test("Empty", () => expect(collection.trim([])).toStrictEqual([]));
  test("One value, skipped", () =>
    expect(collection.trim([false], Boolean)).toStrictEqual([]));
  test("Two values, both skipped", () =>
    expect(collection.trim([false, false], Boolean)).toStrictEqual([]));
  test("Last kept", () =>
    expect(collection.trim([false, false, true], Boolean)).toStrictEqual([
      true,
    ]));
  test("First kept", () =>
    expect(collection.trim([true, false, false], Boolean)).toStrictEqual([
      true,
    ]));
  test("All kept", () =>
    expect(collection.trim([true, false, false, true], Boolean)).toStrictEqual([
      true,
      false,
      false,
      true,
    ]));
  test("Trim head", () =>
    expect(
      collection.trim([false, false, true, false, false, true], Boolean)
    ).toStrictEqual([true, false, false, true]));
  test("Trim tail", () =>
    expect(
      collection.trim([true, false, false, true, false, false], Boolean)
    ).toStrictEqual([true, false, false, true]));
  test("Trim head and tail", () =>
    expect(
      collection.trim(
        [false, false, true, false, false, true, false, false],
        Boolean
      )
    ).toStrictEqual([true, false, false, true]));
});
describe("objectFromArray()", () => {
  test("Undefined", () =>
    expect(collection.objectFromArray(undefined)).toStrictEqual({}));
  test("Empty", () => expect(collection.objectFromArray([])).toStrictEqual({}));
  test("One element", () =>
    expect(collection.objectFromArray([1], 0)).toStrictEqual({ 1: 0 }));
  test("Two elements", () =>
    expect(collection.objectFromArray([1, 2], 0)).toStrictEqual({
      1: 0,
      2: 0,
    }));
});
describe("foldToArray()", () => {
  test("Undefined", () =>
    expect(collection.foldToArray(undefined)).toStrictEqual([]));
  test("Empty", () => expect(collection.foldToArray({})).toStrictEqual([]));
  test("One property", () =>
    expect(collection.foldToArray({ key: 1 }, (a, b) => b - a)).toStrictEqual([
      { key: "key", value: 1 },
    ]));
  test("Two properties", () =>
    expect(
      collection.foldToArray({ key: 1, key2: 2 }, (a, b) => a.value - b.value)
    ).toStrictEqual([
      { key: "key", value: 1 },
      { key: "key2", value: 2 },
    ]));
  test("Two properties in reverse order", () =>
    expect(
      collection.foldToArray({ key: 2, key2: 1 }, (a, b) => a.value - b.value)
    ).toStrictEqual([
      { key: "key2", value: 1 },
      { key: "key", value: 2 },
    ]));
});
describe("calculateRanks()", () => {
  const valueMapper = (_) => _.value;
  test("Undefined", () =>
    expect(collection.calculateRanks(undefined, valueMapper)).toStrictEqual(
      {}
    ));
  test("Empty", () =>
    expect(collection.calculateRanks([], valueMapper)).toStrictEqual({}));
  test("[1]", () =>
    expect(
      collection.calculateRanks([{ value: 1 }], valueMapper)
    ).toStrictEqual({ 1: 0 }));
  test("[1, 1]", () =>
    expect(
      collection.calculateRanks([{ value: 1 }, { value: 1 }], valueMapper)
    ).toStrictEqual({ 1: 0 }));
  test("[1, 2]", () =>
    expect(
      collection.calculateRanks([{ value: 2 }, { value: 1 }], valueMapper)
    ).toStrictEqual({ 1: 1, 2: 0 }));
  test("[1, 2, 3]", () =>
    expect(
      collection.calculateRanks(
        [{ value: 2 }, { value: 1 }, { value: 3 }],
        valueMapper
      )
    ).toStrictEqual({ 1: 2, 2: 1, 3: 0 }));
  test("[1, 2, 2]", () =>
    expect(
      collection.calculateRanks(
        [{ value: 2 }, { value: 1 }, { value: 2 }],
        valueMapper
      )
    ).toStrictEqual({ 1: 2, 2: 0 }));
});
describe("truncateAndProcess()", () => {
  let mockProcessor;
  let summarizer;
  beforeEach(() => {
    mockProcessor = jest.fn((x) => {
      if (!x) {
        return 0;
      }
      return x.length;
    });
    summarizer = jest.fn((data) => {
      return {
        key: "other",
        value: data.map((_) => _.value).reduce((a, b) => a + b, 0),
      };
    });
  });
  test("Undefined", () => {
    expect(
      collection.truncateAndProcess(undefined, 0, mockProcessor, summarizer)
    ).toBe(0);
    expect(summarizer).not.toBeCalled();
    expect(mockProcessor).toBeCalled();
  });
  test("Undefined, with limit", () => {
    expect(
      collection.truncateAndProcess(undefined, 1, mockProcessor, summarizer)
    ).toBe(0);
    expect(summarizer).not.toBeCalled();
    expect(mockProcessor).toBeCalled();
  });
  test("Empty", () => {
    expect(
      collection.truncateAndProcess([], 0, mockProcessor, summarizer)
    ).toBe(0);
    expect(summarizer).not.toBeCalled();
    expect(mockProcessor).toBeCalled();
  });
  test("Empty, with limit", () => {
    expect(
      collection.truncateAndProcess([], 1, mockProcessor, summarizer)
    ).toBe(0);
    expect(summarizer).not.toBeCalled();
    expect(mockProcessor).toBeCalled();
  });
  test("Single", () => {
    expect(
      collection.truncateAndProcess(
        [{ key: "k1", value: 1 }],
        0,
        mockProcessor,
        summarizer
      )
    ).toBe(1);
    expect(summarizer).not.toBeCalled();
    expect(mockProcessor).toBeCalled();
    expect(mockProcessor.mock.calls[0][0]).toStrictEqual([
      { key: "k1", value: 1 },
    ]);
  });
  test("Single, limit", () => {
    expect(
      collection.truncateAndProcess(
        [{ key: "k1", value: 1 }],
        1,
        mockProcessor,
        summarizer
      )
    ).toBe(1);
    expect(summarizer).not.toBeCalled();
    expect(mockProcessor).toBeCalled();
    expect(mockProcessor.mock.calls[0][0]).toStrictEqual([
      { key: "k1", value: 1 },
    ]);
  });
  test("Two", () => {
    expect(
      collection.truncateAndProcess(
        [
          { key: "k1", value: 1 },
          { key: "k2", value: 2 },
        ],
        0,
        mockProcessor,
        summarizer
      )
    ).toBe(2);
    expect(summarizer).not.toBeCalled();
    expect(mockProcessor).toBeCalled();
    expect(mockProcessor.mock.calls[0][0]).toStrictEqual([
      { key: "k1", value: 1 },
      { key: "k2", value: 2 },
    ]);
  });
  test("Two, limit", () => {
    expect(
      collection.truncateAndProcess(
        [
          { key: "k1", value: 1 },
          { key: "k2", value: 2 },
        ],
        1,
        mockProcessor,
        summarizer
      )
    ).toBe(1);
    expect(summarizer).toBeCalled();
    expect(mockProcessor).toBeCalled();
    expect(mockProcessor.mock.calls[0][0]).toStrictEqual([
      { key: "other", value: 3 },
    ]);
  });
  test("Three", () => {
    expect(
      collection.truncateAndProcess(
        [
          { key: "k1", value: 1 },
          { key: "k2", value: 2 },
          { key: "k3", value: 3 },
        ],
        0,
        mockProcessor,
        summarizer
      )
    ).toBe(3);
    expect(summarizer).not.toBeCalled();
    expect(mockProcessor).toBeCalled();
    expect(mockProcessor.mock.calls[0][0]).toStrictEqual([
      { key: "k1", value: 1 },
      { key: "k2", value: 2 },
      { key: "k3", value: 3 },
    ]);
  });
  test("Three, limit", () => {
    expect(
      collection.truncateAndProcess(
        [
          { key: "k1", value: 1 },
          { key: "k2", value: 2 },
          { key: "k3", value: 3 },
        ],
        1,
        mockProcessor,
        summarizer
      )
    ).toBe(1);
    expect(summarizer).toBeCalled();
    expect(mockProcessor).toBeCalled();
    expect(mockProcessor.mock.calls[0][0]).toStrictEqual([
      { key: "other", value: 6 },
    ]);
  });
});
describe("numSortByFieldAsc()", () => {
  test("First === Second", () =>
    expect(collection.numSortByFieldAsc("key")({ key: 1 }, { key: 1 })).toBe(
      0
    ));
  test("First < Second", () =>
    expect(
      collection.numSortByFieldAsc("key")({ key: 1 }, { key: 2 })
    ).toBeLessThan(0));
  test("First < Second", () =>
    expect(
      collection.numSortByFieldAsc("key")({ key: 2 }, { key: 1 })
    ).toBeGreaterThan(0));
  test("Any < NaN", () =>
    expect(
      collection.numSortByFieldAsc("key")({ key: 1 }, { key: "foo" })
    ).toBeLessThan(0));
  test("NaN > Any", () =>
    expect(
      collection.numSortByFieldAsc("key")({ key: "foo" }, { key: 1 })
    ).toBeGreaterThan(0));
  test("NaN === NaN", () =>
    expect(
      collection.numSortByFieldAsc("key")({ key: "foo" }, { key: "bar" })
    ).toBe(0));
});
describe("numSortByFieldDesc()", () => {
  test("First === Second", () =>
    expect(collection.numSortByFieldDesc("key")({ key: 1 }, { key: 1 })).toBe(
      0
    ));
  test("First < Second", () =>
    expect(
      collection.numSortByFieldDesc("key")({ key: 1 }, { key: 2 })
    ).toBeGreaterThan(0));
  test("First < Second", () =>
    expect(
      collection.numSortByFieldDesc("key")({ key: 2 }, { key: 1 })
    ).toBeLessThan(0));
  test("Any < NaN", () =>
    expect(
      collection.numSortByFieldDesc("key")({ key: 1 }, { key: "foo" })
    ).toBeLessThan(0));
  test("NaN > Any", () =>
    expect(
      collection.numSortByFieldDesc("key")({ key: "foo" }, { key: 1 })
    ).toBeGreaterThan(0));
  test("NaN === NaN", () =>
    expect(
      collection.numSortByFieldDesc("key")({ key: "foo" }, { key: "bar" })
    ).toBe(0));
});
