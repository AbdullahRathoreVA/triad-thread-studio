"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { primaryNav } from "@/config/site";
import { useScrolledPast } from "@/hooks/use-environment";
import { cn } from "@/lib/utils";

export function Nav() {
  const [hovered, setHovered] = useState<string | null>(null);
  const pathname = usePathname();

  // Subscribed rather than sniffed in an effect, so a page restored
  // mid-scroll paints the condensed bar on the first frame, not the second.
  const scrolled = useScrolledPast(40);

  /**
   * The drawer stores the route it was opened on, and is considered open only
   * while that still matches. Navigating therefore closes it for free — no
   * effect that fires a setState on every route change, and no window where
   * the new page renders with last page's menu still covering it.
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  const setOpen = useCallback(
    (next: boolean | ((v: boolean) => boolean)) => {
      setOpenedOn((current) => {
        const isOpen = current === pathname;
        const wanted = typeof next === "function" ? next(isOpen) : next;
        return wanted ? pathname : null;
      });
    },
    [pathname],
  );

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);

  const active = hovered ? primaryNav.find((n) => n.label === hovered) : null;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-100 transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          scrolled || open
            ? "border-b border-hairline bg-ink-900/85 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
        onMouseLeave={() => setHovered(null)}
      >
        <div className="container-luxe flex h-[74px] items-center justify-between gap-8">
          <Link
            href="/"
            className="relative flex shrink-0 items-center gap-3"
            aria-label="Triad Thread Studio — home"
          >
            <Image
              src="/brand/logo-primary.jpg"
              alt=""
              width={40}
              height={40}
              priority
              className="size-10 rounded-xs object-cover"
            />
            <span className="hidden font-roman text-[0.72rem] leading-tight tracking-[0.26em] text-ink-50 sm:block">
              TRIAD
              <br />
              <span className="text-gold-300">THREAD</span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {primaryNav.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <li key={item.label} onMouseEnter={() => setHovered(item.label)}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative block py-2 font-roman text-[0.68rem] uppercase tracking-[0.24em] transition-colors duration-300",
                        isActive ? "text-gold-300" : "text-ink-200 hover:text-ink-50",
                      )}
                    >
                      {item.label}
                      <span
                        className={cn(
                          "absolute -bottom-px left-0 h-px w-full origin-left bg-gold-300 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                          isActive
                            ? "scale-x-100"
                            : "scale-x-0 group-hover:scale-x-100",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/customize"
              className="hidden shrink-0 items-center rounded-xs border border-gold-300/40 px-6 py-3 font-roman text-[0.66rem] uppercase tracking-[0.2em] text-gold-100 transition-colors duration-300 hover:border-gold-300 hover:bg-gold-300/8 md:inline-flex"
            >
              Design Yours
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="grid size-10 place-items-center text-ink-100 lg:hidden"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Desktop mega-panel */}
        <AnimatePresence>
          {active?.children && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              className="hidden overflow-hidden border-t border-hairline bg-ink-900/95 backdrop-blur-xl lg:block"
            >
              <div className="container-luxe grid grid-cols-[1fr_2fr] gap-16 py-11">
                <div>
                  <p className="eyebrow">{active.label}</p>
                  <p className="mt-4 max-w-xs font-display text-2xl text-ink-100">
                    {active.description}
                  </p>
                </div>
                <ul className="grid grid-cols-2 gap-x-10 gap-y-1 self-start">
                  {active.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        className="group flex items-baseline justify-between border-b border-hairline py-4 text-sm text-ink-200 transition-colors hover:text-gold-200"
                      >
                        {child.label}
                        <span className="translate-x-0 text-gold-300 opacity-0 transition-all duration-400 group-hover:translate-x-1 group-hover:opacity-100">
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-90 bg-ink-950/97 pt-[74px] backdrop-blur-2xl lg:hidden"
          >
            <nav aria-label="Mobile" className="container-luxe py-10">
              <ul className="space-y-1">
                {primaryNav.map((item, i) => (
                  <motion.li
                    key={item.label}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * i + 0.1, duration: 0.6 }}
                    className="border-b border-hairline"
                  >
                    <Link
                      href={item.href}
                      className="block py-5 font-display text-3xl text-ink-50"
                    >
                      {item.label}
                    </Link>
                    {item.children && (
                      <ul className="pb-5 pl-1">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className="block py-2 text-sm text-ink-300"
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.li>
                ))}
              </ul>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
