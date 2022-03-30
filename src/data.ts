import string from "../data/data.string.json";
import bits from "../data/data.bits.bin";
import pagebits from "../data/data.pagebits.bin";
import name from "../data/data.name.bin";
import aliasc from "../data/data.aliasc.bin";
import aliass from "../data/data.aliass.bin";
import aliast from "../data/data.aliast.bin";
import dnrp from "../data/data.dnrp.bin";
import gc from "../data/data.gc.bin";
import block from "../data/data.block.bin";
import age from "../data/data.age.bin";
import hlvt from "../data/data.hlvt.bin";
import hjsn from "../data/data.hjsn.bin";
import uhdef from "../data/data.uhdef.bin";
import uhman from "../data/data.uhman.bin";

import { pointToYouPlus } from "./formatting";

export type StringField =
  | "dnrp"
  | "gc"
  | "block"
  | "age"
  | "hjsn"
  | "uhdef"
  | "uhman";

export interface Data {
  string: string[];
  bits: DataView;
  pagebits: DataView;
  name: DataView;
  aliasc: DataView;
  aliass: DataView;
  aliast: DataView;
  dnrp: DataView;
  gc: DataView;
  block: DataView;
  age: DataView;
  hlvt: DataView;
  hjsn: DataView;
  uhdef: DataView;
  uhman: DataView;
}

export enum AliasType {
  Correction = 0,
  Control = 1,
  Alternate = 2,
  Figment = 3,
  Abbreviation = 4,
  Unicode1 = 5,
  Cldr = 6,
}

export function fetchAllData(): Promise<Data> {
  return fetchData(
    bits,
    pagebits,
    name,
    aliasc,
    aliass,
    aliast,
    dnrp,
    gc,
    block,
    age,
    hlvt,
    hjsn,
    uhdef,
    uhman,
  );
}

async function fetchData(...paths: string[]): Promise<Data> {
  const [
    bits,
    pagebits,
    name,
    aliasc,
    aliass,
    aliast,
    dnrp,
    gc,
    block,
    age,
    hlvt,
    hjsn,
    uhdef,
    uhman,
  ] = await Promise.all(paths.map(fetchDataView));

  return {
    string,
    bits,
    pagebits,
    name,
    aliasc,
    aliass,
    aliast,
    dnrp,
    gc,
    block,
    age,
    hlvt,
    hjsn,
    uhdef,
    uhman,
  };
}

async function fetchDataView(path: string): Promise<DataView> {
  const response = await fetch(path);
  const buffer = await response.arrayBuffer();
  return new DataView(buffer);
}

// https://stackoverflow.com/q/51419176
type KeyOfType<T, U> = { [P in keyof T]: T[P] extends U ? P : never }[keyof T];
type SparseMemberType = {
  method: KeyOfType<DataView, (_: number) => number>;
  len: number;
};
const Uint8: SparseMemberType = { method: "getUint8", len: 1 };
const Uint16: SparseMemberType = { method: "getUint16", len: 2 };

function getSparse(
  ty: SparseMemberType,
  field: DataView,
  def: number,
  point: number,
): number {
  const page_offset = field.getUint16(Math.floor(point / 256) * 2);
  if (page_offset == 0xffff) return def;

  const offset = 8704 + (page_offset * 256 + (point % 256)) * ty.len;
  return field[ty.method](offset);
}

function getFlag(data: Data, shift: number, point: number): boolean {
  return !!((getSparse(Uint8, data.bits, 0, point) >> shift) & 1);
}

function getPageFlag(data: Data, shift: number, page: number): boolean {
  return !!((data.pagebits.getUint8(page) >> shift) & 1);
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
  field: StringField,
  point: number,
): string | null {
  return getString0(data, field, point);
}

function getString0(
  data: Data,
  field: "name" | StringField,
  point: number,
): string | null {
  const index = getSparse(Uint16, data[field], 0xffff, point);
  return getStringByIndex(data, index);
}

function getStringByIndex(data: Data, index: number): string | null {
  if (index == 0xffff || index >= data.string.length) {
    return null;
  }

  return data.string[index];
}

/**
 * Returns the Name property for the given point, regardless of
 * whether the property is defined by enumeration or by rule.
 *
 * This name is displayed in the details panel and search results.
 *
 * Note that charming currently overrides this name while generating
 * data files, with the last formal name alias of type figment or
 * control or correction (if any).
 */
export function getNameProperty(data: Data, point: number): string | null {
  if (hasDerivedNameNr1(data, point)) {
    const prefix = getString(data, "dnrp", point);
    return `${prefix}${getHangulSyllableName(data, point)}`;
  } else if (hasDerivedNameNr2(data, point)) {
    const prefix = getString(data, "dnrp", point);
    return `${prefix}${pointToYouPlus(point, "")}`;
  }

  return getString0(data, "name", point);
}

/**
 * Returns the Name property for the given point, but only if it can’t
 * be derived by a rule (regardless of whether the name is stated in
 * UnicodeData.txt explicitly).
 */
export function getNonDerivedName(data: Data, point: number): string | null {
  if (hasDerivedNameNr1(data, point) || hasDerivedNameNr2(data, point)) {
    return null;
  }

  return getNameProperty(data, point);
}

/**
 * Returns the Name property for the given point, but only if it can’t
 * be derived by rule NR2 (regardless of whether the name is stated in
 * UnicodeData.txt explicitly).
 *
 * This name is used by the search algorithm.
 */
export function getNameExceptNr2(data: Data, point: number): string | null {
  if (hasDerivedNameNr2(data, point)) {
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
  // FIXME figment/control/correction
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

  const lvt = getSparse(Uint16, data.hlvt, 0, point);
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

export function getAliasCount(data: Data, point: number): number {
  return getSparse(Uint8, data.aliasc, 0, point);
}

export function getAliasValue(data: Data, aliasIndex: number): string | null {
  const ty = Uint16;
  const offset = aliasIndex * ty.len;
  return getStringByIndex(data, data.aliass[ty.method](offset));
}

export function getAliasType(data: Data, aliasIndex: number): AliasType | null {
  const ty = Uint8;
  const offset = aliasIndex * ty.len;
  return data.aliast[ty.method](offset);
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

export function hasAnyNameExceptNr2(data: Data, page: number): boolean {
  return getPageFlag(data, 0, page);
}

export function hasAnyUhdef(data: Data, page: number): boolean {
  return getPageFlag(data, 1, page);
}

export function hasAnyAlias(data: Data, page: number): boolean {
  return getPageFlag(data, 2, page);
}
