import React, {
  createContext,
  DependencyList,
  ReactNode,
  useContext,
  useEffect,
} from "react";

class TypedEventTarget<M> extends EventTarget {}

interface TypedEventTarget<M> {
  addEventListener<T extends keyof M>(
    type: T,
    callback: (ev: M[T]) => void,
    options?: AddEventListenerOptions | boolean,
  ): void;
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean,
  ): void;

  removeEventListener<T extends keyof M>(
    type: T,
    callback: (ev: M[T]) => void,
    options?: AddEventListenerOptions | boolean,
  ): void;
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean,
  ): void;
}

interface ShortcutsEventMap {
  keydown: ShortcutKeyboardEvent;
  copy: ShortcutClipboardEvent;
  paste: ShortcutClipboardEvent;
}

class Shortcuts extends TypedEventTarget<ShortcutsEventMap> {
  use<T extends keyof ShortcutsEventMap>(
    type: T,
    callback: (e: ShortcutsEventMap[T]) => void,
    deps?: DependencyList,
  ) {
    useEffect(
      () => {
        this.addEventListener(type, callback);
        return () => this.removeEventListener(type, callback);
      },
      deps ? [this, ...deps] : [this],
    );
  }

  dispatchKeyDown(e: KeyboardEvent) {
    this.dispatchWrapped(new ShortcutKeyboardEvent("keydown", e));
  }

  dispatchCopy(e: ClipboardEvent) {
    // If the user is in an input field, don’t touch the event
    if (e.target instanceof Node && e.target?.nodeName == "INPUT") return;

    // If the user is trying to copy text normally, don't prevent them from doing so
    const selection = window.getSelection(); // TODO: not really ok to do here
    if (selection && selection.type == "Range") return;

    this.dispatchWrapped(new ShortcutClipboardEvent("copy", e));
  }

  dispatchPaste(e: ClipboardEvent) {
    // If the user is in an input field, don’t touch the event
    if (e.target instanceof Node && e.target?.nodeName == "INPUT") return;

    // If the user is trying to copy text normally, don't prevent them from doing so
    const selection = window.getSelection(); // TODO: not really ok to do here
    if (selection && selection.type == "Range") return;

    this.dispatchWrapped(new ShortcutClipboardEvent("paste", e));
  }

  private dispatchWrapped(
    e: CustomEvent<{ inner: { preventDefault(): void } }>,
  ) {
    const cancelled = !this.dispatchEvent(e);
    if (cancelled) {
      e.detail.inner.preventDefault();
    }
  }
}

class ShortcutKeyboardEvent extends CustomEvent<{
  inner: KeyboardEvent;
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}> {
  constructor(type: string, e: KeyboardEvent) {
    super(type, {
      cancelable: true,
      detail: {
        inner: e,
        key: e.key,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
      },
    });
  }

  is(key: string): boolean {
    const detail = this.detail;
    const modifier =
      detail.altKey || detail.ctrlKey || detail.metaKey || detail.shiftKey;

    return !modifier && detail.key == key;
  }
}

class ShortcutClipboardEvent extends CustomEvent<{
  inner: ClipboardEvent;
  clipboardData: DataTransfer | null;
}> {
  constructor(type: string, e: ClipboardEvent) {
    super(type, {
      cancelable: true,
      detail: { inner: e, clipboardData: e.clipboardData },
    });
  }
}

const ShortcutContext = createContext<Shortcuts | null>(null);

export default function useShortcuts(): Shortcuts {
  const shortcuts = useContext(ShortcutContext);
  if (!shortcuts) throw "not inside a ShortcutContext.Provider";
  return shortcuts;
}

export function ShortcutProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const shortcuts = new Shortcuts();

  useEffect(() => {
    if (!active) return;

    const keyDown = (e: KeyboardEvent) => shortcuts.dispatchKeyDown(e);
    const copy = (e: ClipboardEvent) => shortcuts.dispatchCopy(e);
    const paste = (e: ClipboardEvent) => shortcuts.dispatchPaste(e);

    window.addEventListener("keydown", keyDown);
    window.addEventListener("copy", copy);
    window.addEventListener("paste", paste);

    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("copy", copy);
      window.removeEventListener("paste", paste);
    };
  }, [active, shortcuts]);

  return (
    <ShortcutContext.Provider value={shortcuts}>
      {children}
    </ShortcutContext.Provider>
  );
}
