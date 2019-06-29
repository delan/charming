import { getString } from "./data";

test("getString returns correct string", () => {
  const string = [..."abcde"];
  const empty = new DataView(new ArrayBuffer(0));
  const bits = empty;
  const name = new DataView(Uint8Array.of(0, 1, 0, 2).buffer);
  const gc = new DataView(Uint8Array.of(0, 3, 0, 4).buffer);
  const block = empty;
  const age = empty;
  const mpy = empty;
  const data = { string, bits, name, gc, block, age, mpy };

  expect(getString(data, "name", 0)).toBe("b");
  expect(getString(data, "name", 1)).toBe("c");
  expect(getString(data, "gc", 0)).toBe("d");
  expect(getString(data, "gc", 1)).toBe("e");
});
