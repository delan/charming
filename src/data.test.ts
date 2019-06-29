import { getString } from "./data";

const getData = () => {
  const string = [..."abcde"];
  const empty = new DataView(new ArrayBuffer(0));
  const bits = empty;
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
