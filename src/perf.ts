import "core-js/stable";
import "regenerator-runtime/runtime";

import GraphemeSplitter from "grapheme-splitter";
import { Data, fetchAllData, getNextClusterBreak } from "./data";

const splitter = new GraphemeSplitter();
const textarea = document.querySelector("textarea")!;
const button = document.querySelector("button")!;

fetchAllData().then(data => {
  button.disabled = false;
  button.addEventListener("click", () => {
    perfTest(data, textarea.value);
  });
})

function perfTest(data: Data, query: string) {
  let h = fnv1a(0);
  performance.mark(`<`);
  for (let i = 0; i < 420; i++)
    h = perf0(query, h);
  performance.mark(`>`);
  performance.measure("perf0", "<", ">");
  console.log(h.toString(16));

  h = fnv1a(0);
  performance.mark(`<`);
  for (let i = 0; i < 420; i++)
    h = perf1(data, query, h);
  performance.mark(`>`);
  performance.measure("perf1", "<", ">");
  console.log(h.toString(16));
}

function perf0(query: string, h: number) {
  for (const egc of splitter.iterateGraphemes(query))
    h = hashString(egc, h);
  return h;
}

function perf1(data: Data, query: string, h: number) {
  let context = getNextClusterBreak(data!, query);
  if (context == null) return h;
  let i = context.startPointIndex;
  while ((context = getNextClusterBreak(data!, query, context)) != null) {
    for (const egc of query.slice(i, context.startUnitIndex))
      h = hashString(egc, h);
    i = context.startUnitIndex;
  }
  return h;
}

const mul = (x: number, y: number) => Math.imul(x >>> 0, y >>> 0) >>> 0;
const fnv1a = (x: number, h = 2166136261) => mul(h ^ x & 255, 16777619);
const hashChar = (x: number, h: number) => fnv1a(x, fnv1a(x >> 8, h));
function hashString(x: string, h: number): number {
  h = fnv1a(x.length, h);
  for (let i = 0; i < x.length; i++)
    h = hashChar(x.charCodeAt(i), h);
  return h;
}
