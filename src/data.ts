import string from "../data/data.string.json";
import bits from "../data/data.bits.bin";
import name from "../data/data.name.bin";
import dnrp from "../data/data.dnrp.bin";
import gc from "../data/data.gc.bin";
import block from "../data/data.block.bin";
import age from "../data/data.age.bin";
import hlvt from "../data/data.hlvt.bin";
import hjsn from "../data/data.hjsn.bin";
import uhdef from "../data/data.uhdef.bin";
import uhman from "../data/data.uhman.bin";

import { pointToYouPlus } from "./formatting";

export interface Data {
  string: string[];
  bits: DataView;
  name: DataView;
  dnrp: DataView;
  gc: DataView;
  block: DataView;
  age: DataView;
  hlvt: DataView;
  hjsn: DataView;
  uhdef: DataView;
  uhman: DataView;
}

export function fetchAllData(): Promise<Data> {
  return fetchData(bits, name, dnrp, gc, block, age, hlvt, hjsn, uhdef, uhman);
}

async function fetchData(...paths: string[]): Promise<Data> {
  const [bits, name, dnrp, gc, block, age, hlvt, hjsn, uhdef, uhman] =
    await Promise.all(paths.map(fetchDataView));

  return { string, bits, name, dnrp, gc, block, age, hlvt, hjsn, uhdef, uhman };
}

async function fetchDataView(path: string): Promise<DataView> {
  const response = await fetch(path);
  const buffer = await response.arrayBuffer();
  return new DataView(buffer);
}

function getFlag(data: Data, shift: number, point: number): boolean {
  return !!((data.bits.getUint8(point) >> shift) & 1);
}

/**
 * Returns the string value for the given point and field.
 *
 * Do not use this function for the name field. For names, choose a
 * semantics appropriate for the context, then define a higher-level
 * function that wraps getString0.
 */
export function getString(
  data: Data,
  field: "dnrp" | "gc" | "block" | "age" | "hjsn" | "uhdef" | "uhman",
  point: number,
): string | null {
  return getString0(data, field, point);
}

function getString0(
  data: Data,
  field: "name" | "dnrp" | "gc" | "block" | "age" | "hjsn" | "uhdef" | "uhman",
  point: number,
): string | null {
  const index = data[field].getUint16(point * 2);

  if (index == 0xffff || index >= data.string.length) {
    return null;
  }

  return data.string[index];
}

export function getNameProperty(data: Data, point: number): string | null {
  if (hasDerivedNameNr1(data, point)) {
    const prefix = getString(data, "dnrp", point);
    return `${prefix}${getHangulSyllableName(data, point)}`;
  } else if (hasDerivedNameNr2(data, point)) {
    const prefix = getString(data, "dnrp", point);
    return `${prefix}${pointToYouPlus(point).slice(2)}`;
  }

  return getString0(data, "name", point);
}

export function getNonDerivedName(data: Data, point: number): string | null {
  if (hasDerivedNameNr1(data, point) || hasDerivedNameNr2(data, point)) {
    return null;
  }

  return getNameProperty(data, point);
}

/**
 * Returns the old-charming character name for the given point.
 *
 * Old-charming overrides character names with Unihan kDefinition (if
 * defined), allowing users to search for CJK ideographs by definition
 * when #search_han is checked.
 */
export function getOldName(data: Data, point: number): string | null {
  return getString(data, "uhdef", point) ?? getString0(data, "name", point);
}

export function getHangulSyllableName(
  data: Data,
  point: number,
): string | null {
  // 3.12  Conjoining Jamo Behavior
  const L_BASE = 0x1100;
  const V_BASE = 0x1161;
  const T_BASE = 0x11a7;

  const lvt = data.hlvt.getUint16(point * 2);
  const [present, l, v, t] = [
    (lvt >> 15) & 0b1,
    (lvt >> 10) & 0b11111,
    (lvt >> 5) & 0b11111,
    lvt & 0b11111,
  ];

  if (present == 1) {
    const ln = getString(data, "hjsn", L_BASE + l);
    const vn = getString(data, "hjsn", V_BASE + v);
    const tn = t > 0 ? getString(data, "hjsn", T_BASE + t) : "";
    return `${ln}${vn}${tn}`;
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

export function hasDerivedNameNr1(data: Data, point: number): boolean {
  return getFlag(data, 4, point);
}

export function hasDerivedNameNr2(data: Data, point: number): boolean {
  return getFlag(data, 5, point);
}
