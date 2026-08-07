"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ButtonLink } from "@/components/ui/button";
import { capabilities } from "@/config/site";

/**
 * The WebGL scene is client-only and code-split: three + drei is ~180KB gzipped
 * and must never sit in the initial bundle or block first paint. The CSS
 * gradient backdrop renders instantly underneath, so there is no empty frame.
 */
const HeroScene = dynamic(
  () => import("@/components/three/hero-scene").then((m) => m.HeroScene),
  { ssr: false },
);

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden">
      <HeroScene />

      {/* Legibility scrim. Without this the headline sits on live 3D and the
          contrast ratio becomes unpredictable frame to frame. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-t from-ink-950 via-ink-950/55 to-ink-950/25"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-ink-950 to-transparent"
      />

      <div className="container-luxe relative z-10 pb-16 pt-40 sm:pb-24">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 0.2 }}
          className="eyebrow"
        >
          Wholesale Manufacturer &amp; Supplier
        </motion.p>

        <h1 className="mt-7 font-display font-light leading-[0.87] tracking-[-0.03em]">
          <span className="sr-only">
            Your label. Our production line.
          </span>

          <span aria-hidden="true" className="block">
            {["Your label.", "Our", "production line."].map((line, i) => (
              <span key={i} className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  initial={{ y: "108%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1.25, ease: EASE, delay: 0.3 + i * 0.11 }}
                  className={
                    i === 2
                      ? "block text-[clamp(3rem,9vw,8.5rem)] text-gilt animate-gilt-sweep will-change-transform"
                      : "block text-[clamp(3rem,9vw,8.5rem)] text-ink-50 will-change-transform"
                  }
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </span>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 0.85 }}
          className="mt-11 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between"
        >
          <p className="max-w-md text-[0.95rem] leading-relaxed text-ink-300">
            Leather jackets, leather goods and sublimated jerseys, manufactured
            to your specification and supplied at trade prices — quoted per run
            and produced under your own label.
          </p>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/bulk" variant="gold" size="lg">
              Request Trade Pricing
            </ButtonLink>
            <ButtonLink href="/customize" variant="outline" size="lg">
              Spec &amp; Price a Run
            </ButtonLink>
          </div>
        </motion.div>
      </div>

      {/* Capability strip — mirrors the icon row in the logo lockup. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 1.15 }}
        className="relative z-10 border-t border-hairline bg-ink-950/55 backdrop-blur-md"
      >
        <ul className="container-luxe grid grid-cols-2 gap-px lg:grid-cols-4">
          {capabilities.map((cap) => (
            <li key={cap.label} className="py-6 pr-6">
              <p className="font-roman text-[0.63rem] uppercase tracking-[0.2em] text-gold-300">
                {cap.label}
              </p>
              <p className="mt-2 text-[0.78rem] leading-snug text-ink-400">
                {cap.detail}
              </p>
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
