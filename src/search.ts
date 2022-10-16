import { AliasType, Data } from "./data";
import SearchWorker from "./search.worker";

export type SearchResult = BaseSearchResult &
  (
    | SequenceValueSearchResult
    | SequenceNameSearchResult
    | NameishSearchResult
    | AliasSearchResult
    | OtherSearchResult
  );

interface BaseSearchResult {
  points: number[];
  score: number;
}

interface SequenceValueSearchResult {
  reason: "sequenceValue";
  sequenceIndex: number;
}

interface SequenceNameSearchResult {
  reason: "sequenceName";
  offset: number;
  sequenceIndex: number;
  sequenceNameIndex: number;
}

interface NameishSearchResult {
  reason: "name" | "uhdef";
  offset: number;
}

interface AliasSearchResult {
  reason: "alias";
  offset: number;
  aliasIndex: number;
  aliasType: AliasType;
}

interface OtherSearchResult {
  reason: "hex" | "dec" | "breakdown";
}

interface SearchResultKey {
  key: string;
}

export type KeyedSearchResult = SearchResult & SearchResultKey;

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
