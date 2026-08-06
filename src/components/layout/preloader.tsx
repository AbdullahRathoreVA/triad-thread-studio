"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SESSION_KEY = "tts:introShown";

/**
 * Whether this page load should show the intro curtain.
 *
 * Decided once per page load and cached at module scope, because
 * `getSnapshot` must be referentially stable — and because the decision
 * genuinely is a one-shot: the sessionStorage flag is claimed at the same
 * moment it is read, so a second mount in the same tab never re-shows it.
 */
let introDecision: boolean | null = null;

function shouldShowIntro(): boolean {
  if (introDecision === null) {
    try {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      introDecision = !reduced && !sessionStorage.getItem(SESSION_KEY);
      if (introDecision) sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Private-mode Safari throws on sessionStorage. Skip the curtain rather
      // than crash the whole page over a decoration.
      introDecision = false;
    }
  }
  return introDecision;
}

const noopSubscribe = () => () => {};

/**
 * Cinematic intro curtain.
 *
 * Rules it obeys, because loading screens are where luxury sites usually start
 * costing conversions:
 *  - Once per session only. A curtain on every navigation is an obstacle.
 *  - Skipped entirely for reduced-motion users.
 *  - `aria-hidden` and never focusable, so screen readers and crawlers go
 *    straight to the real content underneath.
 *  - Hard 2.6s ceiling regardless of load state — it can never strand a user.
 */
export function Preloader() {
  const wanted = useSyncExternalStore(noopSubscribe, shouldShowIntro, () => false);
  const [finished, setFinished] = useState(false);
  const [progress, setProgress] = useState(0);

  const active = wanted && !finished;

  useEffect(() => {
    if (!active) return;

    document.body.style.overflow = "hidden";

    const started = performance.now();
    const DURATION = 2200;
    let frame = 0;

    const tick = (now: number) => {
      // Ease-out so the counter decelerates into 100 rather than snapping.
      const t = Math.min((now - started) / DURATION, 1);
      setProgress(Math.round((1 - Math.pow(1 - t, 3)) * 100));
      if (t < 1) frame = requestAnimationFrame(tick);
      else setFinished(true);
    };
    frame = requestAnimationFrame(tick);

    // Wall-clock backstop: if rAF is throttled (background tab, battery saver)
    // the curtain must still lift rather than trap the page.
    const ceiling = setTimeout(() => setFinished(true), 2600);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(ceiling);
      document.body.style.overflow = "";
    };
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          aria-hidden="true"
          className="grain fixed inset-0 z-500 flex flex-col items-center justify-center bg-ink-950"
          exit={{ y: "-100%" }}
          transition={{ duration: 1.1, ease: [0.7, 0, 0.84, 0] }}
        >
          {/* Wordmark, revealed by a rising mask. */}
          <div className="overflow-hidden">
            <motion.p
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              className="animate-gilt-sweep font-roman text-[clamp(1.5rem,5vw,3rem)] tracking-[0.3em] text-gilt"
            >
              TRIAD THREAD
            </motion.p>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="mt-5 font-roman text-[0.6rem] tracking-[0.5em] text-ink-400"
          >
            STUDIO
          </motion.p>

          <div className="mt-14 h-px w-[min(320px,60vw)] bg-ink-700">
            <motion.div
              className="h-full origin-left bg-gold-300"
              style={{ scaleX: progress / 100 }}
            />
          </div>

          <span className="mt-5 font-sans text-[0.65rem] tabular-nums tracking-[0.3em] text-ink-400">
            {String(progress).padStart(3, "0")}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
