import { EGCBREAK } from "../data/egcbreak";

import { pointToYouPlus } from "./formatting";
import { pointToString, stringToPoint, stringToPoints } from "./encoding";

export type StringField =
  | "dnrp"
  | "gc"
  | "block"
  | "age"
  | "hjsn"
  | "uhdef"
  | "uhman";

export interface Data {
  info: DataInfo;

  string: string[];

  bits: DataView;
  ebits: DataView;
  pagebits: DataView;
  name: DataView;
  aliasc: DataView;
  aliasi: DataView;
  aliass: DataView;
  aliast: DataView;
  dnrp: DataView;
  gb: DataView;
  gc: DataView;
  block: DataView;
  age: DataView;
  hlvt: DataView;
  hjsn: DataView;
  uhdef: DataView;
  uhman: DataView;

  seqb: DataView;
  seqp: DataView;
  seqn: DataView;
}

export interface DataInfo {
  sequenceBucketCount: number;
  sequenceCount: number;
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

export interface SequenceBucket {
  start: number;
  len: number;
}

export enum GraphemeBreak {
  Cr = 1,
  Lf = 2,
  Control = 3,
  Extend = 4,
  Zwj = 5,
  RegionalIndicator = 6,
  Prepend = 7,
  SpacingMark = 8,
  HangulL = 9,
  HangulV = 10,
  HangulT = 11,
  HangulLV = 12,
  HangulLVT = 13,
}

// https://stackoverflow.com/q/51419176
type KeyOfType<T, U> = { [P in keyof T]: T[P] extends U ? P : never }[keyof T];
type SparseMemberType = {
  method: KeyOfType<DataView, (_: number) => number>;
  len: number;
};
const Uint8: SparseMemberType = { method: "getUint8", len: 1 };
const Uint16: SparseMemberType = { method: "getUint16", len: 2 };

function getSparse<T>(
  ty: SparseMemberType,
  field: DataView,
  def: T,
  point: number,
): number | T {
  const page_offset = field.getUint16(Math.floor(point / 256) * 2);
  if (page_offset == 0xffff) return def;

  const offset = 8704 + (page_offset * 256 + (point % 256)) * ty.len;
  return field[ty.method](offset);
}

function getFlag(data: Data, shift: number, point: number): boolean {
  return !!((getSparse(Uint8, data.bits, 0, point) >> shift) & 1);
}

function getEmojiFlag(data: Data, shift: number, point: number): boolean {
  return !!((getSparse(Uint8, data.ebits, 0, point) >> shift) & 1);
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

export function getAliasBaseIndex(data: Data, point: number): number | null {
  return getSparse(Uint16, data.aliasi, null, point);
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

export function findSequenceBucket(
  data: Data,
  firstPoint: number,
  secondPoint: number,
): SequenceBucket | null {
  let h = 0,
    i = 0,
    j = data.seqb.byteLength / 11;
  while (h < j) {
    i = h + Math.floor((j - h) / 2);
    const x = data.seqb.getUint32(i * 11 + 0);
    if (x != firstPoint) {
      if (j - h == 1) return null;
      else if (x < firstPoint) h = i;
      else if (x > firstPoint) j = i;
      continue;
    }
    const y = data.seqb.getUint32(i * 11 + 4);
    if (y != secondPoint) {
      if (j - h == 1) return null;
      else if (y < secondPoint) h = i;
      else if (y > secondPoint) j = i;
      continue;
    } else {
      break;
    }
  }
  const start = data.seqb.getUint16(i * 11 + 8);
  const len = data.seqb.getUint8(i * 11 + 10);
  return { start, len };
}

export function findSequenceIndex(data: Data, points: number[]): number | null {
  if (points.length < 2) return null;
  const bucket = findSequenceBucket(data, points[0], points[1]);
  if (bucket == null) return null;

  for (let i = bucket.start; i < bucket.start + bucket.len; i++) {
    const ps = getSequencePoints(data, i)!;
    if (ps.length == points.length && ps.every((p, i) => p == points[i])) {
      return i;
    }
  }

  return null;
}

export function getSequencePoints(
  data: Data,
  sequenceIndex: number,
): number[] | null {
  const start = data.seqp.getUint16(sequenceIndex * 3 + 0);
  const len = data.seqp.getUint8(sequenceIndex * 3 + 2);
  const base = data.info.sequenceCount * 3;
  const result = [];
  for (let i = start; i < start + len; i++)
    result.push(data.seqp.getUint32(base + i * 4));
  return result;
}

export function getSequenceNames(
  data: Data,
  sequenceIndex: number,
): string[] | null {
  const start = data.seqn.getUint16(sequenceIndex * 3 + 0);
  const len = data.seqn.getUint8(sequenceIndex * 3 + 2);
  const base = data.info.sequenceCount * 3;
  const result = [];
  for (let i = start; i < start + len; i++)
    result.push(getStringByIndex(data, data.seqn.getUint16(base + i * 2))!);
  return result;
}

export function getSequenceNameByIndices(
  data: Data,
  sequenceIndex: number,
  sequenceNameIndex: number,
): string | null {
  const start = data.seqn.getUint16(sequenceIndex * 3 + 0);
  const len = data.seqn.getUint16(sequenceIndex * 3 + 2);
  if (sequenceNameIndex < 0 || sequenceNameIndex >= len) return null;

  const base = data.info.sequenceCount * 3;
  return getStringByIndex(
    data,
    data.seqn.getUint16(base + (start + sequenceNameIndex) * 2),
  );
}

export function getGraphemeBreak(
  data: Data,
  point: number,
): GraphemeBreak | null {
  return getSparse(Uint8, data.gb, null, point);
}

export function kDefinitionExists(data: Data, point: number): boolean {
  return getFlag(data, 0, point);
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

export function isEmoji(data: Data, point: number): boolean {
  return getEmojiFlag(data, 0, point);
}

export function isExtendedPictographic(data: Data, point: number): boolean {
  return getEmojiFlag(data, 1, point);
}

export function isEmojiComponent(data: Data, point: number): boolean {
  return getEmojiFlag(data, 2, point);
}

export function isEmojiPresentation(data: Data, point: number): boolean {
  return getEmojiFlag(data, 3, point);
}

export function isEmojiModifier(data: Data, point: number): boolean {
  return getEmojiFlag(data, 4, point);
}

export function isEmojiModifierBase(data: Data, point: number): boolean {
  return getEmojiFlag(data, 5, point);
}

interface ClusterBreaker {
  startUnitIndex: number;
  startPointIndex: number;
  kind: string;
}

export function getNextClusterBreak(
  data: Data,
  string: string,
  context: ClusterBreaker | null = null,
): ClusterBreaker | null {
  if (context == null) {
    if (string.length == 0) return null;

    let kind = "";
    for (const pointish of string) {
      const point = stringToPoint(pointish)!;
      const gb = getGraphemeBreak(data, point) ?? 0;
      const exp = Number(isExtendedPictographic(data, point));
      kind += String.fromCharCode((exp << 7) | gb);
    }

    // GB1: sot / Any
    return {
      startUnitIndex: 0,
      startPointIndex: 0,
      kind,
    };
  }

  if (context.startUnitIndex == string.length) return null;

  EGCBREAK.lastIndex = context.startPointIndex;
  EGCBREAK.exec(context.kind);

  for (let i = context.startPointIndex; i < EGCBREAK.lastIndex; i++)
    context.startUnitIndex +=
      string.codePointAt(context.startUnitIndex)! > 0xffff ? 2 : 1;
  context.startPointIndex = EGCBREAK.lastIndex;

  return context;
}

export function getEmojiPresentationRuns(data: Data, string: string): number[] {
  const points = stringToPoints(string);
  const result = [0];
  let emojiRun = false;
  for (let i = 0, j = 0; j < string.length /* nothing */; ) {
    const n = consumeEmojiSeq(i);
    // console.log(`gEPR j=${j} i=${i} n=${n} point=${pointToYouPlus(points[i])} emojiRun=${emojiRun}`);
    if ((n != null) != emojiRun) {
      emojiRun = !emojiRun;
      result.push(j);
    }
    for (let k = 0; k < (n ?? 1); i++, k++) j += points[i] > 0xffff ? 2 : 1;
  }
  return result;

  function consumeEmojiSeq(i: number): number | null {
    return consumeStandaloneSeq(i) ?? consumeSeqSeq(i);
  }

  function consumeStandaloneSeq(i: number): number | null {
    return consumeKeycapSeq(i) ?? consumeFlagSeq(i);
  }

  function consumeSeqSeq(i: number): number | null {
    const n = consumeTagBaseOrZwjElement(i);
    if (n == null) return null;
    return consumeZwjSeq(i, n) ?? consumeTagSeq(i, n) ?? n;
  }

  function consumeTagBaseOrZwjElement(i: number): number | null {
    const point = lookahead(i, 0, (x) => x);
    if (point == null) return null;
    if (isEmoji(data, point))
      if (isEmojiPresentation(data, point))
        if (lookahead(i, 1, (x) => x == 0xfe0e)) return null;
        else return 1;
      else if (lookahead(i, 1, (x) => x == 0xfe0f)) return 2;
      else if (isEmojiModifierBase(data, point))
        if (lookahead(i, 1, (x) => isEmojiModifier(data, x))) return 2;
        else return null;
    return null;
  }

  function consumeZwjSeq(i: number, n: number): number | null {
    const isZwj = (x: number) => x == 0x200d;
    let n_ = add(n, consume(i, n, isZwj));
    if (n_ == null) return null;
    n_ = add(n_, consumeTagBaseOrZwjElement(i + n_));
    if (n_ == null) return null;
    while (i + n_ < points.length) {
      let updated = add(n_, consume(i, n_, isZwj));
      if (updated == null) break;
      updated = add(updated, consumeTagBaseOrZwjElement(i + updated));
      if (updated == null) break;
      n_ = updated;
    }
    return n_;
  }

  function consumeTagSeq(i: number, n: number): number | null {
    while (lookahead(i, n, (x) => 0xe0020 <= x && x <= 0xe007e)) n += 1;
    if (lookahead(i, n, (x) => x == 0xe007f)) return n + 1;
    return null;
  }

  function consumeKeycapSeq(i: number): number | null {
    if (lookahead(i, 0, (x) => /[0-9#*]/.test(pointToString(x))))
      if (lookahead(i, 1, (x) => x == 0xfe0f))
        if (lookahead(i, 2, (x) => x == 0x20e3)) return 3;
    return null;
  }

  function consumeFlagSeq(i: number): number | null {
    const RI = GraphemeBreak.RegionalIndicator;
    if (!lookahead(i, 0, (x) => getGraphemeBreak(data, x) == RI)) return null;
    if (!lookahead(i, 1, (x) => getGraphemeBreak(data, x) == RI)) return null;
    return 2;
  }

  function add(result: number, add: number | null): number | null {
    return add != null ? result + add : null;
  }

  function consume(
    i: number,
    n: number,
    pred: (_: number) => boolean,
  ): number | null {
    return lookahead(i, n, (x) => (pred(x) == true ? 1 : null));
  }

  function lookahead<T>(i: number, n: number, fun: (_: number) => T): T | null {
    return i + n < points.length ? fun(points[i + n]) : null;
  }
}
