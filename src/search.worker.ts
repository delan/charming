import "core-js/stable";
import "regenerator-runtime/runtime";

import GraphemeSplitter from "grapheme-splitter"; // FIXME Unicode 10.0.0

import { Data, getNameExceptNr2, getString } from "./data";
import { stringToPoint } from "./encoding";
import { toHexadecimal, toDecimal } from "./formatting";
import { KeyedSearchResult } from "./search";

// https://github.com/webpack-contrib/worker-loader/issues/94#issuecomment-449861198
export default {} as typeof Worker & { new (): Worker };

declare function postMessage(message: any): void;

let cache: Data | null = null;
const splitter = new GraphemeSplitter();

function* searchByHexadecimal(
  keyStart: number,
  query: string,
): Generator<KeyedSearchResult> {
  const point = parseInt(query, 16);

  if (point != point || point < 0) {
    return;
  }

  if (toHexadecimal(point).length != query.length) {
    return;
  }

  if (point >= 0x110000) {
    return;
  }

  yield { key: keyStart, point, reason: "hex", score: 0 };
}

function* searchByDecimal(
  keyStart: number,
  query: string,
): Generator<KeyedSearchResult> {
  const point = parseInt(query, 10);

  if (point != point || point < 0) {
    return;
  }

  if (toDecimal(point).length != query.length) {
    return;
  }

  if (point >= 0x110000) {
    return;
  }

  yield { key: keyStart, point, reason: "dec", score: 0 };
}

function* searchByBreakdown(
  keyStart: number,
  query: string,
  graphemes: number,
): Generator<KeyedSearchResult> {
  let i = 0;

  for (const graphemeCluster of splitter.iterateGraphemes(query)) {
    for (const pointString of graphemeCluster) {
      const point = stringToPoint(pointString);

      if (point != null) {
        yield { key: keyStart + i, point, reason: "breakdown", score: 0 };
      }
    }

    if (++i >= graphemes) {
      return;
    }
  }
}

function* searchByName(
  keyStart: number,
  data: Data,
  query: string,
): Generator<KeyedSearchResult> {
  const upper = query.toUpperCase();

  for (let point = 0; point < 0x110000; point++) {
    const name = getNameExceptNr2(data, point);
    if (name == null) continue;

    const search = name.toUpperCase();
    if (search.includes(upper)) {
      const score = scoreMatch(search, upper);
      yield { key: keyStart + point, point, reason: "name", score };
    }
  }
}

function* searchByUhdef(
  keyStart: number,
  data: Data,
  query: string,
): Generator<KeyedSearchResult> {
  const upper = query.toUpperCase();

  for (let point = 0; point < 0x110000; point++) {
    const uhdef = getString(data, "uhdef", point);
    if (uhdef == null) continue;

    const search = uhdef.toUpperCase();
    if (search.includes(upper)) {
      const score = scoreMatch(search, upper);
      yield { key: keyStart + point, point, reason: "uhdef", score };
    }
  }
}

function scoreMatch(haystack: string, needle: string): number {
  return (
    8 * Number(haystack == needle) +
    4 *
      Number(
        haystack.startsWith(`${needle} `) ||
          haystack.endsWith(` ${needle}`) ||
          haystack.includes(` ${needle} `),
      ) +
    2 * Number(haystack.startsWith(needle) || haystack.includes(` ${needle}`)) +
    1 * Number(haystack.endsWith(needle) || haystack.includes(`${needle} `))
  );
}

function sortByScore(results: KeyedSearchResult[]): KeyedSearchResult[] {
  // sort by score descending, then by key ascending
  return results.sort((p, q) => q.score - p.score || p.key - q.key);
}

addEventListener("message", ({ data: { data = cache, query } }) => {
  const result: KeyedSearchResult[] = [
    ...searchByHexadecimal(0x220000, query),
    ...searchByDecimal(0x220001, query),
    ...searchByBreakdown(0x220002, query, 3),
    ...sortByScore([...searchByName(0x000000, data, query)]),
    ...sortByScore([...searchByUhdef(0x110000, data, query)]),
  ];

  cache = data;
  postMessage(result);
});
