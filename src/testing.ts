export function getData() {
  //                  0123456789abc
  const string = [..."abcdefghixyz"];
  const empty = makeSparseWithDonkeyVote(0, () => {});
  const bits = makeSparseWithDonkeyVote(1 * 3, (result, start) => {
    result.setUint8(start + 0, 0b10101010);
    result.setUint8(start + 1, 0b01010101);
    result.setUint8(start + 2, 0b11001111);
  });
  // FIXME write tests for ebits, pagebits, alias[cst], gb
  const ebits = new DataView(new ArrayBuffer(0x1100));
  const pagebits = new DataView(new ArrayBuffer(0x1100));
  const name = makeSparseWithDonkeyVote(2 * 3, (result, start) => {
    result.setUint16(start + 2 * 0, 1); // b
    result.setUint16(start + 2 * 1, 2); // c
    result.setUint16(start + 2 * 2, 6); // g
  });
  const aliasc = empty;
  const aliasi = empty;
  const aliass = empty;
  const aliast = empty;
  const dnrp = makeSparseWithDonkeyVote(2 * 2, (result, start) => {
    result.setUint16(start + 2 * 0, 8); // i
    result.setUint16(start + 2 * 1, 7); // h
  });
  const gb = empty;
  const gc = makeSparseWithDonkeyVote(2 * 2, (result, start) => {
    result.setUint16(start + 2 * 0, 3); // d
    result.setUint16(start + 2 * 1, 4); // e
  });
  const block = makeSparseWithDonkeyVote(2 * 2, (result, start) => {
    result.setUint16(start + 2 * 0, 12); // (out of bounds)
    result.setUint16(start + 2 * 1, 0xffff); // (null)
  });
  const age = empty;
  const hlvt = makeSparseWithDonkeyVote(2 * 2, (result, start) => {
    result.setUint16(start + 2 * 1, 0b1_00000_00000_00001);
  });
  const hjsn = makeSparseWithDonkeyVote(2 * (0x11a7 + 2), (result, start) => {
    for (let i = 0; i < 0x11a7 + 2; i++)
      result.setUint16(start + 2 * i, 0xffff);
    result.setUint16(start + 2 * (0x1100 + 0), 0x9);
    result.setUint16(start + 2 * (0x1161 + 0), 0xa);
    result.setUint16(start + 2 * (0x11a7 + 1), 0xb);
  });
  const uhdef = makeSparseWithDonkeyVote(2 * 3, (result, start) => {
    result.setUint16(start + 2 * 0, 0xffff); // (null)
    result.setUint16(start + 2 * 1, 5); // f
    result.setUint16(start + 2 * 2, 0xffff); // (null)
  });
  const uhman = empty;
  return {
    string,
    bits,
    ebits,
    pagebits,
    name,
    aliasc,
    aliasi,
    aliass,
    aliast,
    dnrp,
    gb,
    gc,
    block,
    age,
    hlvt,
    hjsn,
    uhdef,
    uhman,
  };
}

function makeSparseWithDonkeyVote(
  len: number,
  fun: (_: DataView, start: number) => void,
): DataView {
  const start = 0x1100 * 2;
  const result = new DataView(new ArrayBuffer(start + len));
  for (let i = 0; i < 0x1100; i++) result.setUint16(i * 2, i);
  fun(result, start);
  return result;
}
