"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Environment capability hooks.
 *
 * All of these use `useSyncExternalStore` rather than the usual
 * `useState` + `useEffect` capability sniff. Two reasons:
 *
 *  1. It is the pattern React actually sanctions for reading an external
 *     system, and it is what the React Compiler lint rules enforce. A
 *     synchronous setState inside an effect causes a guaranteed second render
 *     of the whole subtree on every mount.
 *  2. It has a real server snapshot, so SSR renders a defined state instead of
 *     flashing the wrong branch and correcting after hydration.
 */

const noopSubscribe = () => () => {};

/* -------------------------------------------------------------------------- */
/* Media queries                                                              */
/* -------------------------------------------------------------------------- */

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // Server assumes "no": motion enabled, coarse pointer. Both are the safe
  // default to render, and both correct themselves on hydration.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export const useReducedMotion = () =>
  useMediaQuery("(prefers-reduced-motion: reduce)");

export const useFinePointer = () =>
  useMediaQuery("(hover: hover) and (pointer: fine)");

/* -------------------------------------------------------------------------- */
/* WebGL                                                                      */
/* -------------------------------------------------------------------------- */

// Cached at module scope: `getSnapshot` must return a referentially stable
// result on every call or React will loop. Creating a canvas per call would
// also be genuinely expensive.
let webglSupport: boolean | null = null;

function getWebGLSnapshot(): boolean {
  if (webglSupport === null) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = Boolean(
        canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
      );
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

export function useWebGLSupport(): boolean {
  return useSyncExternalStore(noopSubscribe, getWebGLSnapshot, () => false);
}

/* -------------------------------------------------------------------------- */
/* Device tier                                                                */
/* -------------------------------------------------------------------------- */

export type DeviceTier = "high" | "low";

let deviceTier: DeviceTier | null = null;

function getDeviceTierSnapshot(): DeviceTier {
  if (deviceTier === null) {
    // Coarse, but the only signals available without burning a benchmark frame.
    // `deviceMemory` is Chromium-only; absent means "assume capable".
    const memory =
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const cores = navigator.hardwareConcurrency ?? 8;
    deviceTier = memory <= 4 || cores <= 4 ? "low" : "high";
  }
  return deviceTier;
}

export function useDeviceTier(): DeviceTier {
  return useSyncExternalStore(
    noopSubscribe,
    getDeviceTierSnapshot,
    () => "high" as const,
  );
}

/* -------------------------------------------------------------------------- */
/* Scroll threshold                                                           */
/* -------------------------------------------------------------------------- */

/**
 * True once the page is scrolled past `threshold`.
 * Reads scrollY directly in the snapshot, so a page restored mid-scroll is
 * correct on the very first render rather than one frame late.
 */
export function useScrolledPast(threshold: number): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener("scroll", onChange, { passive: true });
    return () => window.removeEventListener("scroll", onChange);
  }, []);

  const getSnapshot = useCallback(
    () => window.scrollY > threshold,
    [threshold],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
