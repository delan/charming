import React from "react";

import { Data } from "./data";
import { toHexadecimal } from "./formatting";

export function toFragment(point: number): string {
  return `#${toHexadecimal(point)}`;
}

export function getHashPoint(
  hash: string | undefined,
  or?: undefined,
): number | undefined;
export function getHashPoint<D>(hash: string | undefined, or: D): number | D;
export function getHashPoint(hash: string | undefined, or: any) {
  if (hash == "" || typeof hash == "undefined") {
    return or;
  }

  const point = parseInt(hash.slice(1), 16);

  if (point != point) {
    return or;
  }

  if (toFragment(point).length != hash.length) {
    return or;
  }

  return point;
}

export function fixHashPoint(point: number): void {
  const hash = toFragment(point);

  if (hash != location.hash) {
    history.replaceState(null, "", hash);
  }
}

export const DataContext = React.createContext<Data | null>(null);
export const PointContext = React.createContext<number>(0); // FIXME
