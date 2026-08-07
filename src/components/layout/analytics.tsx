"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Page-view beacon.
 *
 * Fires once per route, including client-side navigations, which a plain
 * server-side counter would miss entirely in an app this SPA-like.
 *
 * `sendBeacon` where available: it survives the page being closed mid-request,
 * so the last page of a visit is not systematically lost — which would quietly
 * bias every exit-page figure.
 *
 * Admin routes are never tracked; the owners looking at their own dashboard
 * should not appear in their own traffic.
 */
export function Analytics() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    // React 18 mounts effects twice in dev; without this every view doubles.
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
    });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/track",
          new Blob([payload], { type: "application/json" }),
        );
      } else {
        void fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    } catch {
      // Analytics must never break a page for a visitor.
    }
  }, [pathname]);

  return null;
}
