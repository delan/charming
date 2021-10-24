import "core-js/stable";
import "regenerator-runtime/runtime";

import GraphemeSplitter from "grapheme-splitter"; // FIXME Unicode 10.0.0

import { Data, getNonDerivedName } from "./data";
import { stringToPoint } from "./encoding";
import { toHexadecimal, toDecimal } from "./formatting";
import { SearchResult } from "./search";

// https://github.com/webpack-contrib/worker-loader/issues/94#issuecomment-449861198
export default {} as typeof Worker & { new (): Worker };

declare function postMessage(message: any): void;

let cache: Data | null = null;
const splitter = new GraphemeSplitter();

function* searchByHexadecimal(data: Data, query: string) {
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

  const name = getNonDerivedName(data, point);
  yield { point, name };
}

function* searchByDecimal(data: Data, query: string) {
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

  const name = getNonDerivedName(data, point);
  const label = `(${point}₁₀)${name != null ? ` ${name}` : ""}`;

  yield { point, name: label };
}

function* searchByBreakdown(data: Data, query: string, graphemes: number) {
  for (const graphemeCluster of splitter.iterateGraphemes(query)) {
    for (const pointString of graphemeCluster) {
      const point = stringToPoint(pointString);

      if (point != null) {
        const name = getNonDerivedName(data, point);
        yield { point, name };
      }
    }

    if (--graphemes <= 0) {
      return;
    }
  }
}

addEventListener("message", ({ data: { data = cache, query } }) => {
  const upper = query.toUpperCase();
  const result: SearchResult[] = [
    ...searchByHexadecimal(data, query),
    ...searchByDecimal(data, query),
    ...searchByBreakdown(data, query, 3),
  ].map((x, i) => ({ key: i + 0x110000, ...x }));

  for (let point = 0; point < 0x110000; point++) {
    const name = getNonDerivedName(data, point);

    if (name != null && name.toUpperCase().includes(upper)) {
      result.push({ key: point, point, name });
    }
  }

  cache = data;
  postMessage(result);
});
