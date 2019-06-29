import {
  pointToString,
  stringToPoint,
  stringToUnits16,
  stringToUnits8,
} from "./encoding";

test("pointToString returns correct string for BMP point", () => {
  expect(pointToString(0x8fea)).toBe("迪");
  expect(pointToString(0x5170)).toBe("兰");
});

test("pointToString returns correct string for astral point", () =>
  void expect(pointToString(0x1f496)).toBe("💖"));

test("pointToString returns U+FFFD when point is surrogate", () => {
  expect(pointToString(0xd7ff)).toBe("\uD7FF");
  expect(pointToString(0xd800)).toBe("\uFFFD");
  expect(pointToString(0xdbff)).toBe("\uFFFD");
  expect(pointToString(0xdc00)).toBe("\uFFFD");
  expect(pointToString(0xdfff)).toBe("\uFFFD");
  expect(pointToString(0xe000)).toBe("\uE000");
});

test("stringToPoint returns correct point for BMP string", () =>
  void expect(stringToPoint("⏿")).toBe(0x23ff));

test("stringToPoint returns correct point for astral string", () =>
  void expect(stringToPoint("💖")).toBe(0x1f496));

test("stringToPoint returns null for empty string", () =>
  void expect(stringToPoint("")).toBe(null));

test("stringToUnits16 returns correct value for BMP string", () =>
  void expect(stringToUnits16("⏿")).toEqual([0x23ff]));

test("stringToUnits16 returns correct value for astral string", () =>
  void expect(stringToUnits16("💖")).toEqual([0xd83d, 0xdc96]));

test("stringToUnits8 returns correct value for BMP string", () =>
  void expect(stringToUnits8("⏿")).toEqual([0xe2, 0x8f, 0xbf]));

test("stringToUnits8 returns correct value for astral string", () =>
  void expect(stringToUnits8("💖")).toEqual([0xf0, 0x9f, 0x92, 0x96]));
