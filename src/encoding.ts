export function pointToString(point: number): string {
  if (isSurrogate(point)) {
    return "\uFFFD";
  }

  return String.fromCodePoint(point);
}

export function stringToPoint(string: string): number | null {
  const result = string.codePointAt(0);

  if (result == undefined) {
    return null;
  }

  return result;
}

export function stringToUnits16(string: string): Array<number> {
  // string.split("") is not to be confused with [...string]
  return string.split("").map(stringToUnit16);
}

export function stringToUnits8(string: string): Array<number> {
  // WTF-8 code units packed in UTF-16 code units
  const octets = unescape(encodeURIComponent(string));

  // string.split("") is not to be confused with [...string]
  return octets.split("").map(stringToUnit16);
}

export function stringToUnit16(string: string): number {
  // https://jsperf.com/charcodeat-vs-charcodeat0
  return string.charCodeAt(0);
}

export function isSurrogate(point: number): boolean {
  return (point & 0xfffff800) == 0xd800;
}

export function pointLengthUnits16(point: number): 1 | 2 {
  if (point > 0x10ffff || isSurrogate(point)) throw new RangeError();
  return point > 0xffff ? 2 : 1;
}

export function pointsToString(points: number[]): string {
  return points.map((x) => pointToString(x)).join("");
}

export function stringToPoints(string: string): number[] {
  return [...string].map((x) => stringToPoint(x)!);
}
