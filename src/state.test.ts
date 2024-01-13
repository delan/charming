/**
 * @jest-environment jsdom
 */

import { toFragment, getHashPoints, fixHashPoints } from "./state";

test("toFragment returns correct value", () =>
  void expect(toFragment([0x1f496])).toBe("#1F496"));

test("getHashPoints returns correct point", () => {
  expect(getHashPoints("#1F496")).toEqual([0x1f496]);
  expect(getHashPoints("#1f496")).toEqual([0x1f496]);
});

test("getHashPoints returns or when hash is undefined", () =>
  void expect(getHashPoints(undefined, null)).toBe(null));

test("getHashPoints returns or when hash is empty", () =>
  void expect(getHashPoints("", null)).toBe(null));

test("getHashPoints returns or when hash is invalid", () =>
  void expect(getHashPoints("#G", null)).toBe(null));

test("getHashPoints returns or when hash has trailing rubbish", () =>
  void expect(getHashPoints("#FG", null)).toBe(null));

test("getHashPoints returns or when point ≥ 0x110000", () =>
  void expect(getHashPoints("#110000", null)).toBe(null));

test("fixHashPoints calls History#replaceState iff it needs fixing", () => {
  const replaceState = jest.spyOn(history, "replaceState");
  location.hash = "#f";

  replaceState.mockClear();
  fixHashPoints(location.hash, [0xf]);
  expect(replaceState).toHaveBeenCalledWith(null, "", "#F");

  replaceState.mockClear();
  fixHashPoints(location.hash, [0xf]);
  expect(replaceState).not.toHaveBeenCalled();
});
