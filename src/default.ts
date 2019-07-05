export function nullToDefault(value: boolean | null, or: boolean): boolean;
export function nullToDefault(value: number | null, or: number): number;
export function nullToDefault(value: string | null, or: string): string;
export function nullToDefault(value: symbol | null, or: symbol): symbol;
export function nullToDefault<T>(value: T | null, or: T): T {
  if (value == null) {
    return or;
  }

  return value;
}
