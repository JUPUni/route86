"use client";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** True after hydration on the client, false during SSR and the first client render. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Read a boolean flag from localStorage without setState-in-effect; updates on `storage` and a custom event. */
export function useLocalFlag(key: string): [boolean, (v: boolean) => void] {
  const subscribe = (cb: () => void) => {
    window.addEventListener("storage", cb);
    window.addEventListener(`local:${key}`, cb);
    return () => {
      window.removeEventListener("storage", cb);
      window.removeEventListener(`local:${key}`, cb);
    };
  };
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try { return localStorage.getItem(key) === "1"; } catch { return false; }
    },
    () => false,
  );
  const set = (v: boolean) => {
    try { localStorage.setItem(key, v ? "1" : "0"); } catch {}
    window.dispatchEvent(new Event(`local:${key}`));
  };
  return [value, set];
}
