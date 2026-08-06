"use client";

import { useEffect, useRef, useState } from "react";
import { useFinePointer, useReducedMotion } from "@/hooks/use-environment";

type CursorMode = "default" | "link" | "drag" | "view";

const MODE_LABEL: Record<CursorMode, string> = {
  default: "",
  link: "",
  drag: "DRAG",
  view: "VIEW",
};

/**
 * Custom cursor: a precise 5px dot with a lagging ring.
 *
 * Position is written straight to the DOM inside rAF rather than through React
 * state — a setState per mousemove would re-render the tree ~120×/second.
 *
 * Disabled for touch/coarse pointers and for reduced-motion users, in which
 * case the native cursor is never hidden (see globals.css).
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<CursorMode>("default");
  const [visible, setVisible] = useState(false);

  // Derived during render from external stores — no capability sniff in an
  // effect, so no cascading second render on mount.
  const finePointer = useFinePointer();
  const reducedMotion = useReducedMotion();
  const enabled = finePointer && !reducedMotion;

  useEffect(() => {
    if (!enabled) return;

    document.body.dataset.customCursor = "on";

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { ...target };
    let frame = 0;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      setVisible(true);

      // Resolve intent from the element under the pointer.
      const el = e.target as HTMLElement | null;
      const interactive = el?.closest<HTMLElement>(
        "a, button, [role='button'], input, select, textarea, [data-cursor]",
      );
      setMode(
        (interactive?.dataset.cursor as CursorMode) ??
          (interactive ? "link" : "default"),
      );
    };

    const onLeave = () => setVisible(false);

    const render = () => {
      // The dot tracks exactly; the ring eases toward it. That lag is the
      // whole effect — it reads as weight.
      ring.x += (target.x - ring.x) * 0.16;
      ring.y += (target.y - ring.y) * 0.16;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%)`;
      }
      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      delete document.body.dataset.customCursor;
    };
  }, [enabled]);

  if (!enabled) return null;

  const expanded = mode === "drag" || mode === "view";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-9999"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 300ms" }}
    >
      <div
        ref={dotRef}
        className="fixed left-0 top-0 size-[5px] rounded-full bg-gold-200"
        style={{ opacity: expanded ? 0 : 1, transition: "opacity 200ms" }}
      />
      <div
        ref={ringRef}
        className="fixed left-0 top-0 flex items-center justify-center rounded-full border border-gold-300/60"
        style={{
          width: expanded ? 76 : 34,
          height: expanded ? 76 : 34,
          backgroundColor: expanded
            ? "rgb(183 153 118 / 0.10)"
            : mode === "link"
              ? "rgb(183 153 118 / 0.07)"
              : "transparent",
          backdropFilter: expanded ? "blur(2px)" : "none",
          transition:
            "width 420ms cubic-bezier(0.16,1,0.3,1), height 420ms cubic-bezier(0.16,1,0.3,1), background-color 300ms",
        }}
      >
        {MODE_LABEL[mode] && (
          <span className="font-roman text-[9px] tracking-[0.22em] text-gold-100">
            {MODE_LABEL[mode]}
          </span>
        )}
      </div>
    </div>
  );
}
