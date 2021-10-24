export function getData() {
  //                  0123456789abc
  const string = [..."abcdefghixyz"];
  const empty = new DataView(new ArrayBuffer(0));
  const bits = new DataView(
    Uint8Array.of(0b10101010, 0b01010101, 0b11001111).buffer,
  );
  const name = new DataView(Uint8Array.of(0, 1, 0, 2, 0, 6).buffer);
  const dnrp = new DataView(Uint8Array.of(0, 8, 0, 7).buffer);
  const gc = new DataView(Uint8Array.of(0, 3, 0, 4).buffer);
  const block = new DataView(Uint8Array.of(0, 12, 255, 255).buffer);
  const age = empty;
  const hlvt = (() => {
    const result = new DataView(new ArrayBuffer(2 * 2));
    result.setUint16(1 * 2, 0b1_00000_00000_00001);
    return result;
  })();
  const hjsn = (() => {
    const len = 0x11a7 + 2;
    const result = new DataView(new ArrayBuffer(len * 2));
    for (let i = 0; i < len; i++) result.setUint16(i * 2, 0xffff);
    result.setUint16((0x1100 + 0) * 2, 0x9);
    result.setUint16((0x1161 + 0) * 2, 0xa);
    result.setUint16((0x11a7 + 1) * 2, 0xb);
    return result;
  })();
  const uhdef = new DataView(Uint8Array.of(255, 255, 0, 5, 255, 255).buffer);
  const uhman = empty;
  return { string, bits, name, dnrp, gc, block, age, hlvt, hjsn, uhdef, uhman };
}
