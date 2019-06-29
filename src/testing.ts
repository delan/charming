export function getData() {
  const string = [..."abcde"];
  const empty = new DataView(new ArrayBuffer(0));
  const bits = new DataView(Uint8Array.of(0b10101010, 0b01010101).buffer);
  const name = new DataView(Uint8Array.of(0, 1, 0, 2).buffer);
  const gc = new DataView(Uint8Array.of(0, 3, 0, 4).buffer);
  const block = new DataView(Uint8Array.of(0, 5, 255, 255).buffer);
  const age = empty;
  const mpy = empty;
  return { string, bits, name, gc, block, age, mpy };
}
