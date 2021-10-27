import "core-js/stable";
import "regenerator-runtime/runtime";

import GraphemeSplitter from "grapheme-splitter"; // FIXME Unicode 10.0.0

import { Data, getNameExceptNr2, getString } from "./data";
import { stringToPoint } from "./encoding";
import { toHexadecimal, toDecimal } from "./formatting";
import { KeyedSearchResult, SearchResult } from "./search";

// https://github.com/webpack-contrib/worker-loader/issues/94#issuecomment-449861198
export default {} as typeof Worker & { new (): Worker };

declare function postMessage(message: any): void;

let cache: Data | null = null;
const splitter = new GraphemeSplitter();

function* searchByHexadecimal(query: string): Generator<SearchResult> {
  const point = parseInt(query, 16);

  if (point != point) {
    return;
  }

  if (toHexadecimal(point).length != query.length) {
    return;
  }

  if (point >= 0x110000) {
    return;
  }

  yield { point, reason: "hex" };
}

function* searchByDecimal(query: string): Generator<SearchResult> {
  const point = parseInt(query, 10);

  if (point != point) {
    return;
  }

  if (toDecimal(point).length != query.length) {
    return;
  }

  if (point >= 0x110000) {
    return;
  }

  yield { point, reason: "dec" };
}

function* searchByBreakdown(
  query: string,
  graphemes: number,
): Generator<SearchResult> {
  for (const graphemeCluster of splitter.iterateGraphemes(query)) {
    for (const pointString of graphemeCluster) {
      const point = stringToPoint(pointString);

      if (point != null) {
        yield { point, reason: "breakdown" };
      }
    }

    if (--graphemes <= 0) {
      return;
    }
  }
}

addEventListener("message", ({ data: { data = cache, query } }) => {
  const upper = query.toUpperCase();
  const result: KeyedSearchResult[] = [
    ...searchByHexadecimal(query),
    ...searchByDecimal(query),
    ...searchByBreakdown(query, 3),
  ].map((x, i) => ({ key: i + 0x110000, ...x }));

  for (let point = 0; point < 0x110000; point++) {
    const search = getNameExceptNr2(data, point);

    if (search != null && search.toUpperCase().includes(upper)) {
      result.push({ key: point, point, reason: "name" });
    }
  }

  for (let point = 0; point < 0x110000; point++) {
    const search = getString(data, "uhdef", point);

    if (search != null && search.toUpperCase().includes(upper)) {
      result.push({ key: point, point, reason: "uhdef" });
    }
  }

  cache = data;
  postMessage(result);
});
