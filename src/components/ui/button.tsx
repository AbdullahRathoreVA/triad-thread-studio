"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "gold" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  // Solid gold on near-black: 8.9:1 contrast. Comfortably AAA for large text.
  gold: "bg-gold-300 text-ink-950 hover:bg-gold-200 border border-transparent",
  outline:
    "border border-gold-300/40 text-gold-100 hover:border-gold-300 hover:bg-gold-300/8",
  ghost: "border border-transparent text-ink-100 hover:text-gold-200",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-5 text-[0.7rem] tracking-[0.18em]",
  md: "h-12 px-8 text-[0.75rem] tracking-[0.2em]",
  lg: "h-14 px-11 text-[0.8rem] tracking-[0.22em]",
};

type BaseProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

function classes({ variant = "gold", size = "md", className }: BaseProps) {
  return cn(
    "group relative inline-flex items-center justify-center overflow-hidden",
    "rounded-xs font-roman uppercase",
    "transition-colors duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
    "disabled:pointer-events-none disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

/** Sheen that wipes across on hover. Decorative only. */
function Sheen() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/18 to-transparent transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-full motion-reduce:hidden"
    />
  );
}

export function Button({
  variant,
  size,
  className,
  children,
  ...props
}: BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={classes({ variant, size, className, children })} {...props}>
      <Sheen />
      <span className="relative">{children}</span>
    </button>
  );
}

export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  ...props
}: BaseProps &
  Omit<React.ComponentProps<typeof Link>, "className" | "children">) {
  return (
    <Link
      href={href}
      className={classes({ variant, size, className, children })}
      {...props}
    >
      <Sheen />
      <span className="relative">{children}</span>
    </Link>
  );
}
