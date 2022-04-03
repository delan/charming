import React from "react";

import { Data } from "./data";
import { toHexadecimal } from "./formatting";

export function toFragment(points: number[]): string {
  return `#${points.map((x) => toHexadecimal(x)).join("-")}`;
}

export function getHashPoints(
  hash: string | undefined,
  or?: undefined,
): number[] | undefined;
export function getHashPoints<D>(hash: string | undefined, or: D): number[] | D;
export function getHashPoints(hash: string | undefined, or: any) {
  if (hash == "" || typeof hash == "undefined") {
    return or;
  }

  const parts = hash.slice(1).split("-");
  const point = parts.map((x) => parseInt(x, 16));

  if (point.some((x) => x != x)) {
    return or;
  }

  if (toFragment(point).length != hash.length) {
    return or;
  }

  if (point.some((x) => x >= 0x110000)) {
    return or;
  }

  return point;
}

export function fixHashPoints(hash: string, points: number[]): void {
  const expected = toFragment(points);
  const actual = hash;

  if (actual != expected) {
    history.replaceState(null, "", expected);
  }
}

export function ifSequence<T>(
  points: number[],
  yes: (_: number[]) => T,
  no: (_: number) => T,
): T {
  if (points.length > 1) return yes(points);
  else return no(points[0]);
}

export const DataContext = React.createContext<Data | null>(null);
export const PointContext = React.createContext<number[]>([0]); // FIXME
