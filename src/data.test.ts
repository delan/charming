import { readFileSync } from "fs";

import {
  getString,
  getNameProperty,
  getNonDerivedName,
  getNameExceptNr2,
  getOldName,
  kDefinitionExists,
  isEmojiPresentation,
  isSpaceSeparator,
  isAnyMark,
  hasDerivedNameNr1,
  hasDerivedNameNr2,
  getNextClusterBreak,
} from "./data";
import { pointsToString } from "./encoding";
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

test("getNameExceptNr2 returns correct value", () => {
  expect(getNameExceptNr2(getData(), 0)).toBe(null);
  expect(getNameExceptNr2(getData(), 1)).toBe("hxyz");
  expect(getNameExceptNr2(getData(), 2)).toBe("g");
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

test("getNextClusterBreak returns correct values", () => {
  const test: string = readFileSync("data/GraphemeBreakTest.txt", "utf8");
  const data = getData();
  data.gb = bufferToDataView(readFileSync("data/data.gb.bin"));
  data.bits = bufferToDataView(readFileSync("data/data.bits.bin"));
  for (const line of test.match(/^÷[ ÷×0-9A-F]+/gm)!) {
    const points = line.match(/[0-9A-F]+/g)!.map((x) => parseInt(x, 16));
    const breaks = line.match(/[÷×]/g)!;
    const string = pointsToString(points);

    let start = null;
    let pointStart = 0;
    let pointLen = 0;
    for (const brake of breaks) {
      switch (brake) {
        case "÷":
          const actual = getNextClusterBreak(data, string, start);
          const expected: number =
            (start ?? 0) +
            pointsToString(points.slice(pointStart, pointStart + pointLen))
              .length;
          if (actual != expected) {
            console.error([line, start, pointStart, pointLen]);
            expect(actual).toBe(expected);
          }
          start = actual;
          pointStart += pointLen;
          pointLen = 1;
          break;
        case "×":
          pointLen += 1;
          break;
      }
    }
  }
});

function bufferToDataView(buffer: Buffer): DataView {
  const array = new Uint8Array(buffer.byteLength);
  buffer.copy(array, 0, 0, buffer.byteLength);
  return new DataView(array.buffer);
}
