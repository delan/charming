import { readFileSync } from "fs";

import {
  getString,
  getNameProperty,
  getNonDerivedName,
  getNameExceptNr2,
  getOldName,
  kDefinitionExists,
  isSpaceSeparator,
  isAnyMark,
  hasDerivedNameNr1,
  hasDerivedNameNr2,
  getNextClusterBreak,
  getEmojiPresentationRuns,
} from "./data";
import { pointsToString, stringToPoints } from "./encoding";
import { pointsToYouPlus } from "./formatting";
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
  data.ebits = bufferToDataView(readFileSync("data/data.ebits.bin"));
  for (const line of test.match(/^÷[ ÷×0-9A-F]+/gm)!) {
    const points = line.match(/[0-9A-F]+/g)!.map((x) => parseInt(x, 16));
    const breaks = line.match(/[÷×]/g)!;
    const string = pointsToString(points);

    let context = null;
    let pointStart = 0;
    let pointLen = 0;
    for (const brake of breaks) {
      switch (brake) {
        case "÷":
          context = getNextClusterBreak(data, string, context)!;
          const actual = context.startPointIndex;
          const expected = pointStart + pointLen;
          if (actual != expected) {
            console.error([line, pointStart, pointLen, context]);
            expect(actual).toBe(expected);
          }
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

test("getEmojiPresentationRuns returns correct values", () => {
  const data = getData();
  data.gb = bufferToDataView(readFileSync("data/data.gb.bin"));
  data.ebits = bufferToDataView(readFileSync("data/data.ebits.bin"));

  expect(getEmojiPresentationRuns(data, "")).toEqual([0]);
  expect(getEmojiPresentationRuns(data, " ")).toEqual([0]);

  expect(getEmojiPresentationRuns(data, "⌚")).toEqual([0, 0]);
  expect(getEmojiPresentationRuns(data, " ⌚")).toEqual([0, 1]);
  expect(getEmojiPresentationRuns(data, "⌚ ")).toEqual([0, 0, 1]);
  expect(getEmojiPresentationRuns(data, " ⌚ ")).toEqual([0, 1, 2]);
  expect(getEmojiPresentationRuns(data, " ⌚⌚ ")).toEqual([0, 1, 3]);
  expect(getEmojiPresentationRuns(data, " ⌚ ⌚ ")).toEqual([0, 1, 2, 3, 4]);

  const test: string = readFileSync("data/emoji-test.txt", "utf8");
  for (const line of test.match(
    /^[0-9A-F]+(?: [0-9A-F]+)*(?=\s*; fully-qualified(?:\s|#))/gm,
  )!) {
    // if (line != "1F3F3 FE0F 200D 26A7 FE0F") continue;
    const points = line.match(/[0-9A-F]+/g)!.map((x) => parseInt(x, 16));
    const string = pointsToString(points);
    const len = string.length;
    e(0, `${string}`, [0, 0]);
    e(1, ` ${string}`, [0, 1]);
    e(2, `${string} `, [0, 0, len]);
    e(3, ` ${string} `, [0, 1, 1 + len]);
    e(4, ` ${string}${string} `, [0, 1, 1 + 2 * len]);
    e(5, ` ${string} ${string} `, [0, 1, 1 + len, 2 + len, 2 + 2 * len]);
  }

  function e(i: number, string: string, expected: number[]) {
    const actual = getEmojiPresentationRuns(data, string);
    if (String(actual) != String(expected)) {
      console.error(pointsToYouPlus(stringToPoints(string)), `#${i}`);
      expect(actual).toEqual(expected);
    }
  }
});

function bufferToDataView(buffer: Buffer): DataView {
  const array = new Uint8Array(buffer.byteLength);
  buffer.copy(array, 0, 0, buffer.byteLength);
  return new DataView(array.buffer);
}
