import { pointToSyntheticTofu } from "./Display";

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
