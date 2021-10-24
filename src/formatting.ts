import {
  stringToUnits16,
  stringToUnits8,
  pointToString,
  isSurrogate,
} from "./encoding";

export function toHexadecimal(value: number, length = 0): string {
  return value.toString(16).toUpperCase().padStart(length, "0");
}

export function toDecimal(value: number, length = 0): string {
  return value.toString(10).padStart(length, "0");
}

export function pointToYouPlus(point: number): string {
  return `U+${toHexadecimal(point, 4)}`;
}

export function pointToTofu(point: number): string {
  if (0x10000 <= point) {
    return toHexadecimal(point, 6);
  }

  return toHexadecimal(point, 4);
}

export function pointToString16(point: number): string | null {
  if (isSurrogate(point)) {
    return null;
  }

  return stringToUnits16(pointToString(point))
    .map((x) => toHexadecimal(x, 4))
    .join(" ");
}

export function pointToString8(point: number): string | null {
  if (isSurrogate(point)) {
    return null;
  }

  return stringToUnits8(pointToString(point))
    .map((x) => toHexadecimal(x, 2))
    .join(" ");
}

export function pointToEntity10(point: number): string | null {
  // HTML § 12.1.4
  if (
    (point >= 0x0000 && point < 0x0009) ||
    (point >= 0x000b && point < 0x000c) ||
    (point >= 0x000d && point < 0x0020) ||
    (point >= 0x007f && point < 0x00a0) ||
    (point >= 0xfdd0 && point < 0xfdf0) ||
    (point & 0xfffe) == 0xfffe
  ) {
    return null;
  }

  return `&#${point};`;
}
