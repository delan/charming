import string from "../data.string.json";
import bits from "../data.bits.bin";
import name from "../data.name.bin";
import gc from "../data.gc.bin";
import block from "../data.block.bin";
import age from "../data.age.bin";
import mpy from "../data.mpy.bin";

export interface Data {
  string: string[];
  bits: DataView;
  name: DataView;
  gc: DataView;
  block: DataView;
  age: DataView;
  mpy: DataView;
}

export function fetchAllData(): Promise<Data> {
  return fetchData(bits, name, gc, block, age, mpy);
}

async function fetchData(...paths: string[]): Promise<Data> {
  const [bits, name, gc, block, age, mpy] = await Promise.all(
    paths.map(fetchDataView),
  );

  return { string, bits, name, gc, block, age, mpy };
}

async function fetchDataView(path: string): Promise<DataView> {
  const response = await fetch(path);
  const buffer = await response.arrayBuffer();
  return new DataView(buffer);
}

function getFlag(data: Data, shift: number, point: number): boolean {
  return !!((data.bits.getUint8(point) >> shift) & 1);
}

export function getString(
  data: Data,
  field: "name" | "gc" | "block" | "age" | "mpy",
  point: number,
): string | null {
  const index = data[field].getUint16(point * 2);

  if (index == 0xffff || index >= data.string.length) {
    return null;
  }

  return data.string[index];
}

export function kDefinitionExists(data: Data, point: number): boolean {
  return getFlag(data, 0, point);
}

export function isEmojiPresentation(data: Data, point: number): boolean {
  return getFlag(data, 1, point);
}

export function isSpaceSeparator(data: Data, point: number): boolean {
  return getFlag(data, 2, point);
}

export function isAnyMark(data: Data, point: number): boolean {
  return getFlag(data, 3, point);
}
