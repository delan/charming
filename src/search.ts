import { Data } from "./data";
import SearchWorker from "./search.worker";

let worker = new SearchWorker();
let listener: ((event: MessageEvent) => void) | null = null;

export function search(data: Data, query: string) {
  if (listener != null) {
    console.warn("search: need to terminate SearchWorker");

    worker.removeEventListener("message", listener);
    worker.terminate();

    worker = new SearchWorker();
    listener = null;
  }

  return new Promise<MessageEvent>(resolve => {
    listener = (event: MessageEvent) => {
      worker.removeEventListener("message", listener!);
      listener = null;
      resolve(event);
    };

    worker.addEventListener("message", listener);
    worker.postMessage({ data, query });
  });
}
