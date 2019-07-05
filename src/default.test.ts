import { nullToDefault } from "./default";

test("nullToDefault returns or when value is null", () =>
  void expect(nullToDefault(null, 42)).toBe(42));

test("nullToDefault returns value when value is not null", () =>
  void expect(nullToDefault(13, 42)).toBe(13));
