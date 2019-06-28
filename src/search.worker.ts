import { Data, getString } from "./data";

// https://github.com/webpack-contrib/worker-loader/issues/94#issuecomment-449861198
export default {} as typeof Worker & { new (): Worker };

declare function postMessage(message: any): void;

let cache: Data | null = null;

addEventListener("message", ({ data: { data = cache, query } }) => {
  const upper = query.toUpperCase();
  const result = [];

  for (let point = 0; point < 0x110000; point++) {
    const name = getString(data, "name", point);

    if (name != null && name.toUpperCase().includes(upper)) {
      result.push([point, name]);
    }
  }

  cache = data;
  postMessage(result);
});
