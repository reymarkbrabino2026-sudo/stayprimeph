"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

type SetLocalStorageStateAction<T> = T | ((current: T) => T);

type LocalStorageStateOptions<T> = {
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
};

const localStorageStateEvent = "stayprimeph:local-storage-state";
const sensitiveClientStorageKeyPattern = /(^|[-_:])(auth|authorization|bearer|cookie|csrf|jwt|session|token)([-_:]|$)/i;

export function isSensitiveClientStorageKey(key: string) {
  return sensitiveClientStorageKeyPattern.test(key);
}

function assertSafeClientStorageKey(key: string) {
  if (isSensitiveClientStorageKey(key)) {
    throw new Error("Auth and session tokens must not be stored in localStorage.");
  }
}

function parseStoredValue<T>(raw: string, fallback: T, deserialize?: (value: string) => T) {
  try {
    return deserialize ? deserialize(raw) : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function emitStorageStateChange(key: string) {
  window.dispatchEvent(new CustomEvent(localStorageStateEvent, { detail: { key } }));
}

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  options: LocalStorageStateOptions<T> = {},
): [T, (action: SetLocalStorageStateAction<T>) => void, () => void] {
  assertSafeClientStorageKey(key);
  const { serialize = JSON.stringify, deserialize } = options;
  const snapshotRef = useRef<{ raw: string | null; value: T } | null>(null);

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return defaultValue;

    const raw = window.localStorage.getItem(key);
    const cached = snapshotRef.current;
    if (cached && cached.raw === raw) return cached.value;

    const value = raw === null ? defaultValue : parseStoredValue(raw, defaultValue, deserialize);
    snapshotRef.current = { raw, value };
    return value;
  }, [defaultValue, deserialize, key]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      function handleStorageChange(event: Event) {
        if (event instanceof StorageEvent && event.key !== null && event.key !== key) return;
        if (event instanceof CustomEvent && event.detail?.key !== key) return;
        onStoreChange();
      }

      window.addEventListener("storage", handleStorageChange);
      window.addEventListener(localStorageStateEvent, handleStorageChange);

      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener(localStorageStateEvent, handleStorageChange);
      };
    },
    [key],
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, () => defaultValue);

  const setValue = useCallback(
    (action: SetLocalStorageStateAction<T>) => {
      const current = getSnapshot();
      const next = typeof action === "function" ? (action as (current: T) => T)(current) : action;
      const raw = serialize(next);
      window.localStorage.setItem(key, raw);
      snapshotRef.current = { raw, value: next };
      emitStorageStateChange(key);
    },
    [getSnapshot, key, serialize],
  );

  const removeValue = useCallback(() => {
    window.localStorage.removeItem(key);
    snapshotRef.current = { raw: null, value: defaultValue };
    emitStorageStateChange(key);
  }, [defaultValue, key]);

  return [value, setValue, removeValue];
}
