import {
  getString,
  getNameProperty,
  getNonDerivedName,
  getOldName,
  kDefinitionExists,
  isEmojiPresentation,
  isSpaceSeparator,
  isAnyMark,
  hasDerivedNameNr1,
  hasDerivedNameNr2,
} from "./data";
import { getData } from "./testing";

test("getString returns correct string", () => {
  expect(getString(getData(), "gc", 0)).toBe("d");
  expect(getString(getData(), "gc", 1)).toBe("e");
});

test("getString returns null when index is out of bounds", () =>
  void expect(getString(getData(), "block", 0)).toBe(null));

test("getString returns null when index is sentinel", () =>
  void expect(getString(getData(), "block", 1)).toBe(null));

test("getNameProperty returns correct value", () => {
  expect(getNameProperty(getData(), 0)).toBe("i0000");
  expect(getNameProperty(getData(), 1)).toBe("hxyz");
  expect(getNameProperty(getData(), 2)).toBe("g");
});

test("getNonDerivedName returns correct value", () => {
  expect(getNonDerivedName(getData(), 0)).toBe(null);
  expect(getNonDerivedName(getData(), 1)).toBe(null);
  expect(getNonDerivedName(getData(), 2)).toBe("g");
});

test("getOldName returns correct value", () => {
  expect(getOldName(getData(), 0)).toBe("b");
  expect(getOldName(getData(), 1)).toBe("f");
  expect(getOldName(getData(), 2)).toBe("g");
});

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

test("hasDerivedNameNr1 returns correct value", () => {
  expect(hasDerivedNameNr1(getData(), 0)).toBe(false);
  expect(hasDerivedNameNr1(getData(), 1)).toBe(true);
});

test("hasDerivedNameNr2 returns correct value", () => {
  expect(hasDerivedNameNr2(getData(), 0)).toBe(true);
  expect(hasDerivedNameNr2(getData(), 1)).toBe(false);
});
