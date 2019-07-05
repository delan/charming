import "core-js/stable";
import "regenerator-runtime/runtime";

import GraphemeSplitter from "grapheme-splitter"; // FIXME Unicode 10.0.0

import { Data, getString } from "./data";
import { stringToPoint } from "./encoding";
import { SearchResult } from "./search";

// https://github.com/webpack-contrib/worker-loader/issues/94#issuecomment-449861198
export default {} as typeof Worker & { new (): Worker };

declare function postMessage(message: any): void;

let cache: Data | null = null;
const splitter = new GraphemeSplitter();

function* stringToBreakdown(data: Data, string: string, graphemes: number) {
  for (const graphemeCluster of splitter.iterateGraphemes(string)) {
    for (const pointString of graphemeCluster) {
      const point = stringToPoint(pointString);

      if (point != null) {
        const name = getString(data, "name", point);
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
  const result: SearchResult[] = [...stringToBreakdown(data, query, 3)].map(
    (x, i) => ({ key: i + 0x110000, ...x }),
  );

  for (let point = 0; point < 0x110000; point++) {
    const name = getString(data, "name", point);

    if (name != null && name.toUpperCase().includes(upper)) {
      result.push({ key: point, point, name });
    }
  }

  cache = data;
  postMessage(result);
});
