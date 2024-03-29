import {
  pointToSyntheticTofu,
  pointToDiagonal,
  pointToSubstitute,
} from "./Display";
import { getData } from "./testing";

test("pointToSyntheticTofu returns correct value", () => {
  expect(pointToSyntheticTofu(0xd7ff)).toBe(null);
  expect(pointToSyntheticTofu(0xd800)).toBe("D800");
  expect(pointToSyntheticTofu(0xdfff)).toBe("DFFF");
  expect(pointToSyntheticTofu(0xe000)).toBe(null);
  expect(pointToSyntheticTofu(0xfdcf)).toBe(null);
  expect(pointToSyntheticTofu(0xfdd0)).toBe("FDD0");
  expect(pointToSyntheticTofu(0xfdef)).toBe("FDEF");
  expect(pointToSyntheticTofu(0xfdf0)).toBe(null);
});

test("pointToDiagonal returns correct value", () => {
  expect(pointToDiagonal(0x23ff)).toBe(null);
  expect(pointToDiagonal(0xfeff)).toBe("BOM");
  expect(pointToDiagonal(0x180b)).toBe("FVS1");
  expect(pointToDiagonal(0x180c)).toBe("FVS2");
  expect(pointToDiagonal(0x180d)).toBe("FVS3");
  expect(pointToDiagonal(0xfdef)).toBe(null);
  expect(pointToDiagonal(0xfe00)).toBe("VS1");
  expect(pointToDiagonal(0xfe0f)).toBe("VS16");
  expect(pointToDiagonal(0xfe10)).toBe(null);
  expect(pointToDiagonal(0xe00ff)).toBe(null);
  expect(pointToDiagonal(0xe0100)).toBe("VS17");
  expect(pointToDiagonal(0xe01ef)).toBe("VS256");
  expect(pointToDiagonal(0xe01f0)).toBe(null);
});

test("pointToSubstitute returns correct value", () => {
  const data = getData();
  expect(pointToSubstitute(data, 0x007f)).toBe("␡");
  expect(pointToSubstitute(data, 0x0000)).toBe("␀");
  expect(pointToSubstitute(data, 0x001f)).toBe("␟");
  expect(pointToSubstitute(null, 0x0020)).toBe(null);
  expect(pointToSubstitute(null, 0xe001f)).toBe(null);
  expect(pointToSubstitute(data, 0xe0020)).toBe("␠ₜ");
  expect(pointToSubstitute(data, 0xe0021)).toBe("!ₜ");
  expect(pointToSubstitute(data, 0xe007e)).toBe("~ₜ");
  expect(pointToSubstitute(null, 0xe007f)).toBe(null);
});
