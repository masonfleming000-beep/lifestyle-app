/**
 * Small localStorage-backed page store helper for Astro pages.
 * Keeps repeated load/save/reset/merge logic out of page files.
 */
export interface PersistentStoreOptions<T> {
  key: string;
  defaults: T;
  version?: number;
  storage?: Storage;
  merge?: (defaults: T, stored: Partial<T>) => T;
  migrate?: (stored: unknown, version: number) => Partial<T>;
  onLoad?: (value: T) => void;
  onSave?: (value: T) => void;
}

export interface PersistentStore<T> {
  get: () => T;
  set: (next: T | ((current: T) => T)) => T;
  patch: (partial: Partial<T>) => T;
  reset: () => T;
  save: () => T;
  load: () => T;
  clear: () => void;
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function defaultMerge<T>(defaults: T, stored: Partial<T>): T {
  if (Array.isArray(defaults) || Array.isArray(stored)) {
    return cloneValue((stored as T) ?? defaults);
  }

  if (
    defaults &&
    typeof defaults === "object" &&
    stored &&
    typeof stored === "object"
  ) {
    const result: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };

    for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
      const defaultValue = (defaults as Record<string, unknown>)[key];

      if (
        defaultValue &&
        typeof defaultValue === "object" &&
        !Array.isArray(defaultValue) &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        result[key] = defaultMerge(defaultValue, value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result as T;
  }

  return cloneValue((stored as T) ?? defaults);
}

export function createPersistentStore<T>(options: PersistentStoreOptions<T>): PersistentStore<T> {
  const {
    key,
    defaults,
    version = 1,
    storage = typeof window !== "undefined" ? window.localStorage : undefined,
    merge = defaultMerge,
    migrate,
    onLoad,
    onSave,
  } = options;

  let state = cloneValue(defaults);

  function serialize(value: T) {
    return JSON.stringify({ version, value });
  }

  function persist(value: T) {
    if (!storage) return value;
    storage.setItem(key, serialize(value));
    onSave?.(value);
    return value;
  }

  function load() {
    if (!storage) {
      state = cloneValue(defaults);
      onLoad?.(state);
      return state;
    }

    try {
      const raw = storage.getItem(key);

      if (!raw) {
        state = cloneValue(defaults);
        onLoad?.(state);
        return state;
      }

      const parsed = JSON.parse(raw) as { version?: number; value?: unknown } | unknown;
      const parsedObject = parsed && typeof parsed === "object" ? parsed as { version?: number; value?: unknown } : {};
      const parsedVersion = typeof parsedObject.version === "number" ? parsedObject.version : 0;
      const incomingValue = parsedObject.value ?? parsed;
      const migrated = migrate ? migrate(incomingValue, parsedVersion) : (incomingValue as Partial<T>);

      state = merge(cloneValue(defaults), migrated);
    } catch {
      state = cloneValue(defaults);
    }

    onLoad?.(state);
    return state;
  }

  function save() {
    return persist(state);
  }

  function set(next: T | ((current: T) => T)) {
    state = typeof next === "function" ? (next as (current: T) => T)(state) : next;
    return persist(state);
  }

  function patch(partial: Partial<T>) {
    state = merge(state, partial);
    return persist(state);
  }

  function reset() {
    state = cloneValue(defaults);
    return persist(state);
  }

  function clear() {
    storage?.removeItem(key);
    state = cloneValue(defaults);
  }

  return {
    get: () => state,
    set,
    patch,
    reset,
    save,
    load,
    clear,
  };
}
