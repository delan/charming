import React, { useContext } from "react";

import { pointToString, isSurrogate, pointsToString } from "./encoding";
import { pointToTofu } from "./formatting";
import { DataContext } from "./state";
import { Data, isSpaceSeparator, isAnyMark, isEmojiPresentation } from "./data";

export function Display({ points }: { points: number[] }) {
  const data = useContext(DataContext);
  const className = (...xs: string[]) => ["Display", ...xs].join(" ");

  if (points.length > 1) {
    return <span className={className("sequence")}>{pointsToString(points)}</span>;
  }

  const point = points[0];
  const tofu = pointToSyntheticTofu(point);

  if (tofu != null) {
    return (
      <span className={className("synthetic", "tofu")}>
        {[...tofu].map((x, i) => (
          <span key={i}>{x}</span>
        ))}
      </span>
    );
  }

  const diagonal = pointToDiagonal(point);

  if (diagonal != null) {
    return (
      <span className={className("synthetic", "diagonal")}>
        {[...diagonal].map((x, i) => (
          <span key={i}>{x}</span>
        ))}
      </span>
    );
  }

  const substitute = pointToSubstitute(data, point);

  if (substitute != null) {
    return <span className={className("synthetic", "substitute")}>{substitute}</span>;
  }

  if (data != null) {
    // FIXME eosrei/twemoji-color-font#39
    if (isEmojiPresentation(data, point)) {
      return <span className={className("emoji")}>{pointToString(point)}</span>;
    }
  }

  return <span className={className()}>{pointToString(point)}</span>;
}

// see dist/scratch/edge-points.html
export function pointToSyntheticTofu(point: number): string | null {
  if (isSurrogate(point) || (0xfdd0 <= point && point < 0xfdf0)) {
    return pointToTofu(point);
  }

  return null;
}

export function pointToDiagonal(point: number): string | null {
  const result: { [index: number]: string } = {
    0x0080: "PAD",
    0x0081: "HOP",
    0x0082: "BPH",
    0x0083: "NBH",
    0x0084: "IND",
    0x0085: "NEL",
    0x0086: "SSA",
    0x0087: "ESA",
    0x0088: "HTS",
    0x0089: "HTJ",
    0x008a: "VTS",
    0x008b: "PLD",
    0x008c: "PLU",
    0x008d: "RI",
    0x008e: "SS2",
    0x008f: "SS3",
    0x0090: "DCS",
    0x0091: "PU1",
    0x0092: "PU2",
    0x0093: "STS",
    0x0094: "CCH",
    0x0095: "MW",
    0x0096: "SPA",
    0x0097: "EPA",
    0x0098: "SOS",
    0x0099: "SGCI",
    0x009a: "SCI",
    0x009b: "CSI",
    0x009c: "ST",
    0x009d: "OSC",
    0x009e: "PM",
    0x009f: "APC",
    0x00ad: "SHY",
    0x034f: "CGJ",
    0x061c: "ALM",
    0x180e: "MVS",
    0x200b: "ZWSP",
    0x200c: "ZWNJ",
    0x200d: "ZWJ",
    0x200e: "LRM",
    0x200f: "RLM",
    0x2028: "LS",
    0x2029: "PS",
    0x202a: "LRE",
    0x202b: "RLE",
    0x202c: "PDF",
    0x202d: "LRO",
    0x202e: "RLO",
    0x2060: "WJ",
    0x2066: "LRI",
    0x2067: "RLI",
    0x2068: "FSI",
    0x2069: "PDI",
    0x206a: "ISS",
    0x206b: "ASS",
    0x206c: "IAFS",
    0x206d: "AAFS",
    0x206e: "NAT",
    0x206f: "NOM",
    0x3164: "HF",
    0xfeff: "BOM",
    0xffa0: "HHF",
    0xfff9: "IAA",
    0xfffa: "IAS",
    0xfffb: "IAT",
    0xfffc: "OBJ",
    0xe0000: "LT",
    0xe007f: "CT",
  };

  if (point in result) {
    return result[point];
  }

  if (0x180b <= point && point < 0x180e) {
    return `FVS${point - 0x180b + 1}`;
  }

  if (0xfe00 <= point && point < 0xfe10) {
    return `VS${point - 0xfe00 + 1}`;
  }

  if (0xe0100 <= point && point < 0xe01f0) {
    return `VS${point - 0xe0100 + 17}`;
  }

  return null;
}

export function pointToSubstitute(
  data: Data | null,
  point: number,
): string | null {
  const result: { [index: number]: string } = {
    0x007f: "\u2421",
    0x2061: "f\u2061()",
    0x2062: "13\u2062x",
    0x2063: "Mᵢ\u2063ⱼ",
    0x2064: "9\u2064¾",
    0xe0020: "\u2420ₜ",
  };

  if (point in result) {
    return result[point];
  }

  if (point < 0x0020) {
    return pointToString(point + 0x2400);
  }

  if (0xe0021 <= point && point < 0xe007f) {
    return `${pointToString(point - 0xe0000)}ₜ`;
  }

  if (data != null) {
    if (isSpaceSeparator(data, point)) {
      return `]${pointToString(point)}[`;
    }

    if (isAnyMark(data, point)) {
      switch (point & 0xfffffff0) {
        case 0x0300: // Combining Diacritical Marks
        case 0x0310:
        case 0x0320:
        case 0x0330:
        case 0x0340:
        case 0x0350:
        case 0x0360:
        case 0x0480: // Cyrillic
        case 0x1dc0: // Combining Diacritical Marks Supplement
        case 0x1dd0:
        case 0x1de0:
        case 0x1df0:
        case 0x20d0: // Combining Diacritical Marks for Symbols
        case 0x20e0:
        case 0x20f0:
        case 0x2ce0: // Coptic
        case 0x2cf0:
        case 0x2de0: // Cyrillic Extended-A
        case 0x2df0:
        case 0xa660: // Cyrillic Extended-B
        case 0xa670:
        case 0xa690:
        case 0xfe00: // Variation Selectors
        case 0xfe20: // Combining Half Marks
        case 0x101f0: // Phaistos Disc
        case 0x102e0: // Coptic Epact Numbers
        case 0x1d160: // Musical Symbols
        case 0x1d170:
        case 0x1d180:
        case 0x1d1a0:
        case 0x1d240: // Ancient Greek Musical Notation
        case 0xe0100: // Variation Selectors Supplement
        case 0xe0110:
        case 0xe0120:
        case 0xe0130:
        case 0xe0140:
        case 0xe0150:
        case 0xe0160:
        case 0xe0170:
        case 0xe0180:
        case 0xe0190:
        case 0xe01a0:
        case 0xe01b0:
        case 0xe01c0:
        case 0xe01d0:
        case 0xe01e0:
          return `\u25CC${pointToString(point)}`;
      }
    }
  }

  return null;
}
