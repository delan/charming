import { toFragment, getHashPoint, fixHashPoint } from "./state";

test("toFragment returns correct value", () =>
  void expect(toFragment(0x1f496)).toBe("#1F496"));

test("getHashPoint returns correct point", () => {
  expect(getHashPoint("#1F496")).toBe(0x1f496);
  expect(getHashPoint("#1f496")).toBe(0x1f496);
});

test("getHashPoint returns or when hash is undefined", () =>
  void expect(getHashPoint(undefined, null)).toBe(null));

test("getHashPoint returns or when hash is empty", () =>
  void expect(getHashPoint("", null)).toBe(null));

test("getHashPoint returns or when hash is invalid", () =>
  void expect(getHashPoint("#G", null)).toBe(null));

test("getHashPoint returns or when hash has trailing rubbish", () =>
  void expect(getHashPoint("#FG", null)).toBe(null));

test("fixHashPoint calls History#replaceState iff it needs fixing", () => {
  const replaceState = jest.spyOn(history, "replaceState");
  location.hash = "#f";

  replaceState.mockClear();
  fixHashPoint(0xf);
  expect(replaceState).toHaveBeenCalledWith(null, "", "#F");

  replaceState.mockClear();
  fixHashPoint(0xf);
  expect(replaceState).not.toHaveBeenCalled();
});
