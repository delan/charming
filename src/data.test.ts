import {
  getString,
  kDefinitionExists,
  isEmojiPresentation,
  isSpaceSeparator,
  isAnyMark,
} from "./data";

const getData = () => {
  const string = [..."abcde"];
  const empty = new DataView(new ArrayBuffer(0));
  const bits = new DataView(Uint8Array.of(0b10101010, 0b01010101).buffer);
  const name = new DataView(Uint8Array.of(0, 1, 0, 2).buffer);
  const gc = new DataView(Uint8Array.of(0, 3, 0, 4).buffer);
  const block = new DataView(Uint8Array.of(0, 5, 255, 255).buffer);
  const age = empty;
  const mpy = empty;
  return { string, bits, name, gc, block, age, mpy };
};

test("getString returns correct string", () => {
  const data = getData();
  expect(getString(data, "name", 0)).toBe("b");
  expect(getString(data, "name", 1)).toBe("c");
  expect(getString(data, "gc", 0)).toBe("d");
  expect(getString(data, "gc", 1)).toBe("e");
});

test("getString returns null when index is out of bounds", () =>
  void expect(getString(getData(), "block", 0)).toBe(null));

test("getString returns null when index is sentinel", () =>
  void expect(getString(getData(), "block", 1)).toBe(null));

test("kDefinitionExists returns correct value", () => {
  expect(kDefinitionExists(getData(), 0)).toBe(false);
  expect(kDefinitionExists(getData(), 1)).toBe(true);
});

test("isEmojiPresentation returns correct value", () => {
  expect(isEmojiPresentation(getData(), 0)).toBe(true);
  expect(isEmojiPresentation(getData(), 1)).toBe(false);
});

test("isSpaceSeparator returns correct value", () => {
  expect(isSpaceSeparator(getData(), 0)).toBe(false);
  expect(isSpaceSeparator(getData(), 1)).toBe(true);
});

test("isAnyMark returns correct value", () => {
  expect(isAnyMark(getData(), 0)).toBe(true);
  expect(isAnyMark(getData(), 1)).toBe(false);
});
