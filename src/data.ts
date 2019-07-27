import string from "../data/data.string.json";
import bits from "../data/data.bits.bin";
import name from "../data/data.name.bin";
import gc from "../data/data.gc.bin";
import block from "../data/data.block.bin";
import age from "../data/data.age.bin";
import mpy from "../data/data.mpy.bin";

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
  const index = getPoolIndex(data[field], point)!;

  if (index == 0xffff || index >= data.string.length) {
    return null;
  }

  return data.string[index];
}

function getPoolIndex(field: DataView, point: number): number | null {
  const runs = field.getUint16(0);
  let currentPoint = 0;
  let currentOffset = 2 + 2 * runs;

  for (let i = 0; i < runs; i++) {
    const code = field.getUint16(2 + 2 * i);
    const isRepeat = !!((code >> 15) & 1);
    const length = code & ((1 << 15) - 1);

    if (point < currentPoint + length) {
      const offset = isRepeat
        ? currentOffset
        : currentOffset + 2 * (point - currentPoint);
      return field.getUint16(offset);
    }

    currentPoint += length;
    currentOffset += isRepeat ? 2 : 2 * length;
  }

  return null;
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
