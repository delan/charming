import { pointToSyntheticTofu, pointToDiagonal } from "./Display";

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
