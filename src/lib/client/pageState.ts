import type { EditableCollectionsPageState } from "../../types/ui";

export interface PageStateResponse<T = unknown> {
  ok: boolean;
  pageKey: string;
  state: T | null;
  updated_at: string | null;
}

export interface ApiPageStoreOptions<State> {
  pageKey: string;
  defaults: State;
  normalize?: (value: unknown) => State;
  serialize?: (value: State) => unknown;
  shadowStorageKey?: string;
}

export interface ApiPageStore<State> {
  getState: () => State;
  setState: (next: State | ((current: State) => State)) => State;
  load: () => Promise<State>;
  save: (options?: { keepalive?: boolean }) => Promise<void>;
  queueSave: (delayMs?: number) => void;
  writeShadow: () => void;
  startLifecyclePersistence: () => () => void;
}

interface ShadowRecord {
  savedAt: string;
  state: unknown;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export async function fetchPageState<T = unknown>(pageKey: string): Promise<PageStateResponse<T> | null> {
  try {
    const response = await fetch(`/api/state?pageKey=${encodeURIComponent(pageKey)}`, {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as PageStateResponse<T>;
  } catch (error) {
    console.error(`Failed to load page state for ${pageKey}:`, error);
    return null;
  }
}

export async function postPageState<T = unknown>(
  pageKey: string,
  state: T,
  options: { keepalive?: boolean } = {}
): Promise<PageStateResponse<T> | null> {
  try {
    const response = await fetch("/api/state", {
      method: "POST",
      credentials: "include",
      keepalive: options.keepalive,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pageKey, state }),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as PageStateResponse<T>;
  } catch (error) {
    console.error(`Failed to save page state for ${pageKey}:`, error);
    return null;
  }
}

export function createApiPageStore<State>(options: ApiPageStoreOptions<State>): ApiPageStore<State> {
  const {
    pageKey,
    defaults,
    normalize = (value) => cloneJson((value as State) ?? defaults),
    serialize = (value) => value,
    shadowStorageKey = `app-page-state-shadow:${pageKey}`,
  } = options;

  let state = normalize(cloneJson(defaults));
  let hasLoaded = false;
  let isSaving = false;
  let pendingSave = false;
  let queuedTimer = 0;
  let lastShadowJson = "";
  let lastRemoteJson = "";

  function readShadow(): ShadowRecord | null {
    return safeParseJson<ShadowRecord>(window.localStorage.getItem(shadowStorageKey));
  }

  function buildShadowRecord(): ShadowRecord {
    const serializedState = serialize(state);
    const existingShadow = readShadow();
    const existingStateJson = existingShadow ? JSON.stringify(existingShadow.state) : "";
    const nextStateJson = JSON.stringify(serializedState);

    return {
      savedAt:
        existingShadow && existingStateJson === nextStateJson && existingShadow.savedAt
          ? existingShadow.savedAt
          : new Date().toISOString(),
      state: serializedState,
    };
  }

  function writeShadowRecord(nextRecord: ShadowRecord) {
    const shadowJson = JSON.stringify(nextRecord);

    if (shadowJson === lastShadowJson) {
      return;
    }

    lastShadowJson = shadowJson;
    window.localStorage.setItem(shadowStorageKey, shadowJson);
  }

  function writeShadow() {
    writeShadowRecord(buildShadowRecord());
  }

  function getSerializedState() {
    return serialize(state);
  }

  async function save(options: { keepalive?: boolean } = {}) {
    if (!hasLoaded) {
      writeShadow();
      return;
    }

    writeShadow();

    if (queuedTimer) {
      window.clearTimeout(queuedTimer);
      queuedTimer = 0;
    }

    if (isSaving) {
      pendingSave = true;
      return;
    }

    isSaving = true;

    try {
      const serializedState = getSerializedState();
      const payloadJson = JSON.stringify(serializedState);
      const response = await postPageState(pageKey, serializedState, {
        keepalive: options.keepalive,
      });

      if (response?.ok) {
        lastRemoteJson = payloadJson;
        writeShadowRecord({
          savedAt: response.updated_at || new Date().toISOString(),
          state: serializedState,
        });
      }
    } finally {
      isSaving = false;

      if (pendingSave) {
        pendingSave = false;
        await save(options);
      }
    }
  }

  function queueSave(delayMs = 300) {
    writeShadow();

    if (!hasLoaded) {
      return;
    }

    if (queuedTimer) {
      window.clearTimeout(queuedTimer);
    }

    queuedTimer = window.setTimeout(() => {
      queuedTimer = 0;
      void save();
    }, delayMs);
  }

  function setState(next: State | ((current: State) => State)) {
    state = normalize(
      typeof next === "function"
        ? (next as (current: State) => State)(state)
        : next
    );
    writeShadow();
    return state;
  }

  function getState() {
    return state;
  }

  async function load() {
    const defaultState = normalize(cloneJson(defaults));
    const shadow = readShadow();
    const remote = await fetchPageState(pageKey);

    const shadowState = shadow?.state ?? null;
    const remoteState = remote?.state ?? null;

    const shadowTimestamp = normalizeTimestamp(shadow?.savedAt);
    const remoteTimestamp = normalizeTimestamp(remote?.updated_at);

    let chosenState: unknown = defaultState;
    let shouldResyncRemote = false;

    if (shadowState && (!remoteState || shadowTimestamp >= remoteTimestamp)) {
      chosenState = shadowState;
      shouldResyncRemote = true;
    } else if (remoteState) {
      chosenState = remoteState;
    }

    state = normalize(chosenState);

    if (remoteState && !shouldResyncRemote) {
      lastRemoteJson = JSON.stringify(getSerializedState());
    }

    hasLoaded = true;
    writeShadow();

    if (shouldResyncRemote) {
      const serializedState = getSerializedState();
      const payloadJson = JSON.stringify(serializedState);

      if (payloadJson !== lastRemoteJson) {
        queueSave(50);
      }
    }

    return state;
  }

  function flushCurrentState() {
    writeShadow();

    if (!hasLoaded) {
      return;
    }

    const serializedState = getSerializedState();
    const payloadJson = JSON.stringify(serializedState);

    if (payloadJson === lastRemoteJson) {
      return;
    }

    const requestJson = JSON.stringify({
      pageKey,
      state: serializedState,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([requestJson], { type: "application/json" });
      const queued = navigator.sendBeacon("/api/state", blob);

      if (queued) {
        lastRemoteJson = payloadJson;
        return;
      }
    }

    lastRemoteJson = payloadJson;
    void fetch("/api/state", {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
      },
      body: requestJson,
    });
  }

  function startLifecyclePersistence() {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushCurrentState();
      }
    };

    const handlePageHide = () => {
      flushCurrentState();
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }

  return {
    getState,
    setState,
    load,
    save,
    queueSave,
    writeShadow,
    startLifecyclePersistence,
  };
}

export function ensureCollectionsRoot<T extends EditableCollectionsPageState>(state: T): T {
  if (!state.collections || typeof state.collections !== "object") {
    state.collections = {};
  }

  return state;
}


export async function loadPageState<T = unknown>(pageKey: string): Promise<T | null> {
  const response = await fetchPageState<T>(pageKey);
  return response?.state ?? null;
}

export function createQueuedPageSaver<State>(client: {
  pageKey: string;
  hasLoadedInitialState: boolean;
  getState: () => State;
}) {
  let isSaving = false;
  let pending = false;

  async function save(options: { keepalive?: boolean } = {}) {
    if (!client.hasLoadedInitialState) return;

    if (isSaving) {
      pending = true;
      return;
    }

    isSaving = true;
    try {
      await postPageState(client.pageKey, client.getState(), options);
    } finally {
      isSaving = false;
      if (pending) {
        pending = false;
        await save(options);
      }
    }
  }

  return save;
}
