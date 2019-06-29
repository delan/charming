export function nullToDefault<T>(value: T | null, or: T): T {
  if (value == null) {
    return or;
  }

  return value;
}
