// Thin localStorage wrapper with an in-memory fallback for SSR/tests.
// All persistence in the prototype flows through here, so swapping in a real
// backend later only touches the repository layer.

const memory = new Map<string, string>();

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function readJson<T>(key: string): T | null {
  const raw = hasLocalStorage() ? window.localStorage.getItem(key) : memory.get(key) ?? null;
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  if (hasLocalStorage()) {
    window.localStorage.setItem(key, raw);
  } else {
    memory.set(key, raw);
  }
}

export function removeKey(key: string): void {
  if (hasLocalStorage()) {
    window.localStorage.removeItem(key);
  } else {
    memory.delete(key);
  }
}

/** Test helper — clears the in-memory fallback. */
export function clearMemoryStore(): void {
  memory.clear();
}
