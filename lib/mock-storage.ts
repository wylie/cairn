const PREFIX = "cairn.mock";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  const storage = window.localStorage as Partial<Storage> | undefined;
  if (!storage) return null;
  if (typeof storage.getItem !== "function") return null;
  if (typeof storage.setItem !== "function") return null;
  if (typeof storage.removeItem !== "function") return null;
  return storage as Storage;
}

export function buildScopedMockKey(orgId: string, locationId: string, bucket: string): string {
  return `${PREFIX}.${orgId}.${locationId}.${bucket}`;
}

export function loadMockState<T>(key: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveMockState<T>(key: string, value: T): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/serialization errors in mock mode.
  }
}

export function clearMockStateKey(key: string): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(key);
}

export function clearScopedMockState(orgId: string, locationId: string, buckets: string[]): void {
  buckets.forEach((bucket) => clearMockStateKey(buildScopedMockKey(orgId, locationId, bucket)));
}
