"use client";

import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Scroll-triggered reveal.
 *
 * `once: true` matters: re-animating on every scroll-back is the single most
 * common way a "premium" site starts feeling like a toy.
 */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const MotionTag = motion[as];
  return (
    <MotionTag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
      transition={{ duration: 0.95, ease: EASE, delay }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

const lineParent: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.075 } },
};

const lineChild: Variants = {
  hidden: { y: "108%" },
  shown: { y: 0, transition: { duration: 1.05, ease: EASE } },
};

/**
 * Masked line-by-line heading reveal.
 *
 * Each line is wrapped in an overflow-hidden box so the text rises from behind
 * a hard edge. The full string stays in one accessible node — screen readers
 * get the heading intact, not a pile of fragments.
 */
export function RevealLines({
  lines,
  className,
  lineClassName,
  as: Tag = "h2",
}: {
  lines: string[];
  className?: string;
  lineClassName?: string;
  as?: "h1" | "h2" | "h3" | "p";
}) {
  return (
    <Tag className={className}>
      <span className="sr-only">{lines.join(" ")}</span>
      <motion.span
        aria-hidden="true"
        variants={lineParent}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true, margin: "-10% 0px" }}
        className="block"
      >
        {lines.map((line, i) => (
          <span key={i} className="block overflow-hidden pb-[0.12em]">
            <motion.span
              variants={lineChild}
              className={cn("block will-change-transform", lineClassName)}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
