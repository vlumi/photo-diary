import color from "./color";

describe("toHexRgb", () => {
  test("negative channel", () =>
    expect(color.toHexRgb({ r: -1, g: 0, b: 0 })).toBe("#000000"));
  test("channel overflow", () =>
    expect(color.toHexRgb({ r: 256, g: 0, b: 0 })).toBe("#000000"));
  test("string channel", () =>
    expect(color.toHexRgb({ r: "f", g: "0", b: "0" })).toBe("#000000"));
  test("black strings", () =>
    expect(color.toHexRgb({ r: "0", g: "0", b: "0" })).toBe("#000000"));
  test("black", () =>
    expect(color.toHexRgb({ r: 0, g: 0, b: 0 })).toBe("#000000"));
  test("dark red", () =>
    expect(color.toHexRgb({ r: 127, g: 0, b: 0 })).toBe("#7f0000"));
  test("red", () =>
    expect(color.toHexRgb({ r: 255, g: 0, b: 0 })).toBe("#ff0000"));
  test("dark green", () =>
    expect(color.toHexRgb({ r: 0, g: 127, b: 0 })).toBe("#007f00"));
  test("green", () =>
    expect(color.toHexRgb({ r: 0, g: 255, b: 0 })).toBe("#00ff00"));
  test("dark blue", () =>
    expect(color.toHexRgb({ r: 0, g: 0, b: 127 })).toBe("#00007f"));
  test("blue", () =>
    expect(color.toHexRgb({ r: 0, g: 0, b: 255 })).toBe("#0000ff"));
  test("white", () =>
    expect(color.toHexRgb({ r: 255, g: 255, b: 255 })).toBe("#ffffff"));
});
describe("fromHexRgb", () => {
  test("undefined", () =>
    expect(color.fromHexRgb(undefined)).toStrictEqual([0, 0, 0]));
  test("empty", () => expect(color.fromHexRgb("")).toStrictEqual([0, 0, 0]));
  test("no hash", () =>
    expect(color.fromHexRgb("010101")).toStrictEqual([0, 0, 0]));
  test("wrong length", () =>
    expect(color.fromHexRgb("#1010101")).toStrictEqual([0, 0, 0]));
  test("#010101", () =>
    expect(color.fromHexRgb("#010101")).toStrictEqual([1, 1, 1]));
  test("#ffffff", () =>
    expect(color.fromHexRgb("#ffffff")).toStrictEqual([255, 255, 255]));
  test("#FFFFFF", () =>
    expect(color.fromHexRgb("#FFFFFF")).toStrictEqual([255, 255, 255]));
  test("#fff", () =>
    expect(color.fromHexRgb("#fff")).toStrictEqual([255, 255, 255]));
  test("#ff0000", () =>
    expect(color.fromHexRgb("#ff0000")).toStrictEqual([255, 0, 0]));
  test("#f00", () =>
    expect(color.fromHexRgb("#f00")).toStrictEqual([255, 0, 0]));
  test("#00ff00", () =>
    expect(color.fromHexRgb("#00ff00")).toStrictEqual([0, 255, 0]));
  test("#0f0", () =>
    expect(color.fromHexRgb("#0f0")).toStrictEqual([0, 255, 0]));
  test("#0000ff", () =>
    expect(color.fromHexRgb("#0000ff")).toStrictEqual([0, 0, 255]));
  test("#00f", () =>
    expect(color.fromHexRgb("#00f")).toStrictEqual([0, 0, 255]));
  test("#007f00", () =>
    expect(color.fromHexRgb("#007f00")).toStrictEqual([0, 127, 0]));
});
describe("colorGradient", () => {
  test("undefined", () => expect(color.colorGradient()).toStrictEqual([]));
  test("grayscale 1", () =>
    expect(color.colorGradient("#000000", "#ffffff", 1)).toStrictEqual([
      "#000000",
    ]));
  test("grayscale 2", () =>
    expect(color.colorGradient("#000000", "#ffffff", 2)).toStrictEqual([
      "#000000",
      "#ffffff",
    ]));
  test("grayscale 3", () =>
    expect(color.colorGradient("#000000", "#ffffff", 3)).toStrictEqual([
      "#000000",
      "#808080",
      "#ffffff",
    ]));
  test("grayscale 4", () =>
    expect(color.colorGradient("#000000", "#ffffff", 4)).toStrictEqual([
      "#000000",
      "#555555",
      "#aaaaaa",
      "#ffffff",
    ]));
  test("red to blue 4", () =>
    expect(color.colorGradient("#ff0000", "#0000ff", 4)).toStrictEqual([
      "#ff0000",
      "#aa0055",
      "#5500aa",
      "#0000ff",
    ]));
});
