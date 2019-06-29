import {
  toHexadecimal,
  pointToYouPlus,
  pointToTofu,
  pointToString16,
  pointToEntity10,
  pointToString8,
} from "./formatting";

test("toHexadecimal returns correct value", () => {
  expect(toHexadecimal(0x0)).toBe("0");
  expect(toHexadecimal(0xf)).toBe("F");
});

test("toHexadecimal pads return value to length", () => {
  expect(toHexadecimal(0xf, 2)).toBe("0F");
  expect(toHexadecimal(0xfff, 2)).toBe("FFF");
});

test("pointToYouPlus returns correct value", () => {
  expect(pointToYouPlus(0x0000)).toBe("U+0000");
  expect(pointToYouPlus(0x10000)).toBe("U+10000");
  expect(pointToYouPlus(0x100000)).toBe("U+100000");
});

test("pointToTofu returns correct value", () => {
  expect(pointToTofu(0x0000)).toBe("0000");
  expect(pointToTofu(0x10000)).toBe("010000");
});

test("pointToString16 returns correct value for BMP point", () =>
  void expect(pointToString16(0x23ff)).toBe("23FF"));

test("pointToString16 returns correct value for astral point", () =>
  void expect(pointToString16(0x1f496)).toBe("D83D DC96"));

test("pointToString16 returns null when point is surrogate", () =>
  void expect(pointToString16(0xd800)).toBe(null));

test("pointToString8 returns correct value for BMP string", () =>
  void expect(pointToString8(0x23ff)).toEqual("E2 8F BF"));

test("pointToString8 returns correct value for astral string", () =>
  void expect(pointToString8(0x1f496)).toEqual("F0 9F 92 96"));

test("pointToString8 returns null when point is surrogate", () =>
  void expect(pointToString8(0xd800)).toBe(null));

test("pointToEntity10 returns correct value", () => {
  expect(pointToEntity10(0x0009)).toBe("&#9;");
  expect(pointToEntity10(0x000a)).toBe("&#10;");
  expect(pointToEntity10(0x000c)).toBe("&#12;");
  expect(pointToEntity10(0x0020)).toBe("&#32;");
  expect(pointToEntity10(0x007e)).toBe("&#126;");
  expect(pointToEntity10(0x00a0)).toBe("&#160;");
  expect(pointToEntity10(0xfdcf)).toBe("&#64975;");
  expect(pointToEntity10(0xfdf0)).toBe("&#65008;");
  expect(pointToEntity10(0xfffd)).toBe("&#65533;");
  expect(pointToEntity10(0x10000)).toBe("&#65536;");
  expect(pointToEntity10(0x1fffd)).toBe("&#131069;");
  expect(pointToEntity10(0x20000)).toBe("&#131072;");
  expect(pointToEntity10(0xffffd)).toBe("&#1048573;");
  expect(pointToEntity10(0x100000)).toBe("&#1048576;");
  expect(pointToEntity10(0x10fffd)).toBe("&#1114109;");
});

test("pointToEntity10 returns null when point has no HTML entity", () => {
  expect(pointToEntity10(0x0000)).toBe(null);
  expect(pointToEntity10(0x0001)).toBe(null);
  expect(pointToEntity10(0x0002)).toBe(null);
  expect(pointToEntity10(0x0003)).toBe(null);
  expect(pointToEntity10(0x0004)).toBe(null);
  expect(pointToEntity10(0x0005)).toBe(null);
  expect(pointToEntity10(0x0006)).toBe(null);
  expect(pointToEntity10(0x0007)).toBe(null);
  expect(pointToEntity10(0x0008)).toBe(null);
  expect(pointToEntity10(0x000b)).toBe(null);
  expect(pointToEntity10(0x000d)).toBe(null);
  expect(pointToEntity10(0x000e)).toBe(null);
  expect(pointToEntity10(0x000f)).toBe(null);
  expect(pointToEntity10(0x0010)).toBe(null);
  expect(pointToEntity10(0x001f)).toBe(null);
  expect(pointToEntity10(0x007f)).toBe(null);
  expect(pointToEntity10(0x0080)).toBe(null);
  expect(pointToEntity10(0x008f)).toBe(null);
  expect(pointToEntity10(0x0090)).toBe(null);
  expect(pointToEntity10(0x009f)).toBe(null);
  expect(pointToEntity10(0xfdd0)).toBe(null);
  expect(pointToEntity10(0xfddf)).toBe(null);
  expect(pointToEntity10(0xfde0)).toBe(null);
  expect(pointToEntity10(0xfdef)).toBe(null);
  expect(pointToEntity10(0xfffe)).toBe(null);
  expect(pointToEntity10(0xffff)).toBe(null);
  expect(pointToEntity10(0x1fffe)).toBe(null);
  expect(pointToEntity10(0x1ffff)).toBe(null);
  expect(pointToEntity10(0xffffe)).toBe(null);
  expect(pointToEntity10(0xfffff)).toBe(null);
  expect(pointToEntity10(0x10fffe)).toBe(null);
  expect(pointToEntity10(0x10ffff)).toBe(null);
});
