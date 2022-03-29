import { Data, SearchableStringField } from "./data";
import SearchWorker from "./search.worker";

export interface SearchResult {
  point: number;
  reason: "hex" | "dec" | "breakdown" | "name" | SearchableStringField;
  score: number;
  offset: number | null;
}

export interface KeyedSearchResult extends SearchResult {
  key: number;
}

let worker = new SearchWorker();
let listener: ((event: MessageEvent) => void) | null = null;
let cache: Data | null = null;

export function search(data: Data, query: string) {
  if (listener != null) {
    console.warn("search: need to terminate SearchWorker");

    worker.removeEventListener("message", listener);
    worker.terminate();

    worker = new SearchWorker();
    listener = null;
    cache = null;
  }

  return new Promise<MessageEvent>((resolve) => {
    listener = (event: MessageEvent) => {
      worker.removeEventListener("message", listener!);
      listener = null;
      cache = data;
      resolve(event);
    };

    worker.addEventListener("message", listener);

    if (cache == data) {
      worker.postMessage({ query });
    } else {
      worker.postMessage({ data, query });
    }
  });
}
