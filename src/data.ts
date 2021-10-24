import string from "../data/data.string.json";
import bits from "../data/data.bits.bin";
import name from "../data/data.name.bin";
import gc from "../data/data.gc.bin";
import block from "../data/data.block.bin";
import age from "../data/data.age.bin";
import uhdef from "../data/data.uhdef.bin";
import uhman from "../data/data.uhman.bin";

export interface Data {
  string: string[];
  bits: DataView;
  name: DataView;
  gc: DataView;
  block: DataView;
  age: DataView;
  uhdef: DataView;
  uhman: DataView;
}

export function fetchAllData(): Promise<Data> {
  return fetchData(bits, name, gc, block, age, uhdef, uhman);
}

async function fetchData(...paths: string[]): Promise<Data> {
  const [bits, name, gc, block, age, uhdef, uhman] = await Promise.all(
    paths.map(fetchDataView),
  );

  return { string, bits, name, gc, block, age, uhdef, uhman };
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
  field: "name" | "gc" | "block" | "age" | "uhdef" | "uhman",
  point: number,
): string | null {
  const index = data[field].getUint16(point * 2);

  if (index == 0xffff || index >= data.string.length) {
    return null;
  }

  return data.string[index];
}

/**
 * Returns the old-charming character name for the given point.
 *
 * Old-charming overrides character names with Unihan kDefinition (if
 * defined), allowing users to search for CJK ideographs by definition
 * when #search_han is checked.
 */
export function getOldName(data: Data, point: number): string | null {
  return getString(data, "uhdef", point) ?? getString(data, "name", point);
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
