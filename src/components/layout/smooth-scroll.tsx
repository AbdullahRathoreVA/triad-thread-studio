"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";

/**
 * Lenis-driven inertial scrolling, wired into a single rAF loop.
 *
 * Two things this deliberately does NOT do:
 *  1. Run at all when `prefers-reduced-motion` is set — hijacked scrolling is
 *     one of the worst offenders for motion sickness, so we hand control back
 *     to the browser entirely rather than just shortening the duration.
 *  2. Intercept modifier-clicks or in-page anchors it doesn't own.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;

    const start = () => {
      if (lenisRef.current) return;

      const lenis = new Lenis({
        duration: 1.15,
        // Exponential ease-out: fast pickup, long glide, no bounce.
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.6,
        // Touch devices already have native inertia; doubling it feels broken.
        syncTouch: false,
      });

      lenisRef.current = lenis;

      const raf = (time: number) => {
        lenis.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      lenisRef.current?.destroy();
      lenisRef.current = null;
    };

    if (!motionQuery.matches) start();

    // Users can toggle the OS setting mid-session; honour it live.
    const onPreferenceChange = () => (motionQuery.matches ? stop() : start());
    motionQuery.addEventListener("change", onPreferenceChange);

    return () => {
      motionQuery.removeEventListener("change", onPreferenceChange);
      stop();
    };
  }, []);

  return <>{children}</>;
}
