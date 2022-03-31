import "core-js/stable";
import "regenerator-runtime/runtime";

import {
  Data,
  getAliasCount,
  getAliasValue,
  getNameExceptNr2,
  getNextClusterBreak,
  getString,
  hasAnyAlias,
  hasAnyNameExceptNr2,
  hasAnyUhdef,
} from "./data";
import { stringToPoint } from "./encoding";
import { toHexadecimal, toDecimal } from "./formatting";
import { KeyedSearchResult } from "./search";

// https://github.com/webpack-contrib/worker-loader/issues/94#issuecomment-449861198
export default {} as typeof Worker & { new (): Worker };

declare function postMessage(message: any): void;

let cache: Data | null = null;

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
  data: Data,
  query: string,
  graphemes: number,
): Generator<KeyedSearchResult> {
  let context = getNextClusterBreak(data, query);
  if (context == null) return;

  let count = 0;
  let i = context.startPointIndex;
  while ((context = getNextClusterBreak(data, query, context)) != null) {
    for (const pointString of query.slice(i, context.startUnitIndex)) {
      const point = stringToPoint(pointString);

      if (point != null) {
        yield {
          key: keyStart + count,
          point,
          reason: "breakdown",
          score: 0,
        };
      }
    }

    i = context.startUnitIndex;
    if (++count >= graphemes) {
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

  for (let page = 0; page < 0x1100; page++) {
    if (page % 0x100 == 0)
      performance.mark(`sBN ${Math.floor(page / 0x100)} <`);
    if (page % 0x100 == 0xff)
      performance.mark(`sBN ${Math.floor(page / 0x100)} >`);
    if (!hasAnyNameExceptNr2(data, page)) continue;

    for (let point = page * 0x100; point < (page + 1) * 0x100; point++) {
      const name = getNameExceptNr2(data, point);
      if (name == null) continue;

      const search = name.toUpperCase();
      if (search.includes(upper)) {
        const [score, offset] = scoreMatch(search, upper);
        yield { key: keyStart + point, point, reason: "name", score, offset };
      }
    }
  }

  for (let i = 0; i < 17; i++)
    performance.measure(`sBN ${i}`, `sBN ${i} <`, `sBN ${i} >`);
}

function* searchByNameAlias(
  keyStart: number,
  data: Data,
  query: string,
): Generator<KeyedSearchResult> {
  const upper = query.toUpperCase();
  let aliasIndex = 0;

  for (let page = 0; page < 0x1100; page++) {
    if (page % 0x100 == 0)
      performance.mark(`sBNA ${Math.floor(page / 0x100)} <`);
    if (page % 0x100 == 0xff)
      performance.mark(`sBNA ${Math.floor(page / 0x100)} >`);
    if (!hasAnyAlias(data, page)) continue;

    for (let point = page * 0x100; point < (page + 1) * 0x100; point++) {
      const aliasCount = getAliasCount(data, point);
      for (let i = 0; i < aliasCount; i++, aliasIndex++) {
        const name = getAliasValue(data, aliasIndex)!;
        // const type = getAliasType(data, aliasIndex)!; // TODO

        const search = name.toUpperCase();
        if (search.includes(upper)) {
          const [score, offset] = scoreMatch(search, upper);
          yield {
            key: keyStart + point,
            point,
            reason: "alias",
            aliasIndex,
            score,
            offset,
          };
        }
      }
    }
  }

  for (let i = 0; i < 17; i++)
    performance.measure(`sBNA ${i}`, `sBNA ${i} <`, `sBNA ${i} >`);
}

function* searchByUhdef(
  keyStart: number,
  data: Data,
  query: string,
): Generator<KeyedSearchResult> {
  const upper = query.toUpperCase();

  for (let page = 0; page < 0x1100; page++) {
    if (page % 0x100 == 0)
      performance.mark(`sBU ${Math.floor(page / 0x100)} <`);
    if (page % 0x100 == 0xff)
      performance.mark(`sBU ${Math.floor(page / 0x100)} >`);
    if (!hasAnyUhdef(data, page)) continue;

    for (let point = page * 0x100; point < (page + 1) * 0x100; point++) {
      const uhdef = getString(data, "uhdef", point);
      if (uhdef == null) continue;

      const search = uhdef.toUpperCase();
      if (search.includes(upper)) {
        const [score, offset] = scoreMatch(search, upper);
        yield { key: keyStart + point, point, reason: "uhdef", score, offset };
      }
    }
  }

  for (let i = 0; i < 17; i++)
    performance.measure(`sBU ${i}`, `sBU ${i} <`, `sBU ${i} >`);
}

function scoreMatch(haystack: string, needle: string): [number, number] {
  let resultScore = 0;
  let resultOffset = haystack.indexOf(needle);

  // prettier-ignore
  {
    // count each kind of match only once, and use offset of best match
        check(1, haystack.endsWith(needle), x => x, () => haystack.length - needle.length)
    ||  check(1, haystack.indexOf(`${needle} `), x => x != -1, x => x);
        check(2, haystack.startsWith(needle), x => x, () => 0)
    ||  check(2, haystack.indexOf(` ${needle}`), x => x != -1, x => x + 1);
        check(4, haystack.startsWith(`${needle} `), x => x, () => 0)
    ||  check(4, haystack.endsWith(` ${needle}`), x => x, () => haystack.length - needle.length)
    ||  check(4, haystack.indexOf(` ${needle} `), x => x != -1, x => x + 1);
        check(8, haystack == needle, x => x, () => 0);
  }

  return [resultScore, resultOffset];

  function check(
    score: number,
    result: any,
    pred: (_: any) => boolean,
    offset: (_: any) => number,
  ): boolean {
    if (pred(result)) {
      resultScore += score;
      resultOffset = offset(result);
      return true;
    } else {
      return false;
    }
  }
}

function sortByScore(results: KeyedSearchResult[]): KeyedSearchResult[] {
  // sort by score descending, then by key ascending
  return results.sort((p, q) => q.score - p.score || p.key - q.key);
}

function dedupResults(results: KeyedSearchResult[]): KeyedSearchResult[] {
  // sort by key ascending, then by score descending, then keep best result for each key
  return results
    .sort((p, q) => p.key - q.key || q.score - p.score)
    .filter((x, i, xs) => x.key != xs[i - 1]?.key);
}

addEventListener("message", ({ data: { data = cache, query } }) => {
  const result: KeyedSearchResult[] = [
    ...searchByHexadecimal(0x220000, query),
    ...searchByDecimal(0x220001, query),
    ...searchByBreakdown(0x220002, data, query, 1),
    ...sortByScore(
      dedupResults([
        ...searchByName(0x000000, data, query),
        ...searchByNameAlias(0x000000, data, query),
      ]),
    ),
    ...sortByScore([...searchByUhdef(0x110000, data, query)]),
  ];

  cache = data;
  postMessage(result);
});
