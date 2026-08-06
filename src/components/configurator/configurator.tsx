"use client";

import { useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Check, RotateCcw, Loader2 } from "lucide-react";
import {
  OPTION_GROUPS,
  STEPS,
  MEASUREMENTS,
  LEATHERS,
  COLOURS,
  FINISHES,
  HARDWARE,
  LININGS,
  THREAD_COLOURS,
  STYLES,
  FITS,
  type Option,
  type OptionGroup,
} from "@/config/configurator";
import {
  calculatePrice,
  missingRequired,
  type Selections,
} from "@/lib/pricing/engine";
import { formatPrice, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { JacketAppearance } from "./jacket-model";

const ConfiguratorPreview = dynamic(
  () => import("./preview").then((m) => m.ConfiguratorPreview),
  { ssr: false },
);

/** Sensible opening spec so the customer sees a complete jacket immediately. */
const DEFAULTS: Selections = {
  gender: "mens",
  style: "biker",
  length: "regular",
  fit: "slim",
  leather: "cowhide-full",
  colour: "jet",
  finish: "matte",
  collar: "notch",
  sleeves: "set-in",
  pockets: "welt",
  lining: "polyester",
  thread: "tonal",
  hardware: "gunmetal",
  size: "m",
};

function find(list: Option[], id: unknown): Option | undefined {
  return list.find((o) => o.id === id);
}

export function Configurator() {
  const [selections, setSelections] = useState<Selections>(DEFAULTS);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  const [instructions, setInstructions] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [coupon, setCoupon] = useState("");
  const [step, setStep] = useState<(typeof STEPS)[number]["id"]>("silhouette");
  const [autoRotate, setAutoRotate] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const select = useCallback((groupId: string, optionId: string) => {
    setSelections((prev) => ({ ...prev, [groupId]: optionId }));
  }, []);

  // Price recomputes synchronously on every keystroke. The engine is pure and
  // takes well under a millisecond, so there is no debounce and no flicker.
  const breakdown = useMemo(
    () =>
      calculatePrice({
        selections,
        quantity,
        texts,
        couponCode: coupon || undefined,
      }),
    [selections, quantity, texts, coupon],
  );

  const appearance: JacketAppearance = useMemo(() => {
    const leather = find(LEATHERS, selections.leather);
    const colour = find(COLOURS, selections.colour);
    const finish = find(FINISHES, selections.finish);
    const hardware = find(HARDWARE, selections.hardware);
    const lining = find(LININGS, selections.lining);
    const thread = find(THREAD_COLOURS, selections.thread);
    const style = find(STYLES, selections.style);
    const fit = find(FITS, selections.fit);

    // Colour wins over the leather's own swatch; the leather contributes grain.
    return {
      leatherColour: colour?.swatch ?? leather?.swatch ?? "#45271a",
      leatherGrain: leather?.grain ?? 26,
      roughness: finish?.roughness ?? leather?.roughness ?? 0.6,
      hardwareColour: hardware?.swatch ?? "#4a4d52",
      liningColour: lining?.swatch ?? "#1a1a1a",
      threadColour:
        thread?.id === "tonal"
          ? (colour?.swatch ?? "#45271a")
          : (thread?.swatch ?? "#e8e0d0"),
      bodyLength:
        style?.id === "long-coat"
          ? 3.5
          : selections.length === "cropped"
            ? 2.1
            : selections.length === "longline"
              ? 3.0
              : 2.6,
      looseness:
        fit?.id === "oversized" ? 1 : fit?.id === "relaxed" ? 0.6 : fit?.id === "regular" ? 0.3 : 0,
    };
  }, [selections]);

  const stepGroups = OPTION_GROUPS.filter((g) => g.step === step);
  const missing = missingRequired(selections);
  const isMadeToMeasure = selections.size === "made-to-measure";

  const reset = () => {
    setSelections(DEFAULTS);
    setTexts({});
    setMeasurements({});
    setInstructions("");
    setQuantity(1);
    setCoupon("");
  };

  return (
    <div className="grid min-h-[100svh] lg:grid-cols-[1fr_minmax(420px,38%)]">
      {/* ---- Preview ------------------------------------------------------ */}
      <div className="relative min-h-[52svh] border-b border-hairline bg-ink-950 lg:sticky lg:top-0 lg:h-[100svh] lg:min-h-0 lg:border-b-0 lg:border-r">
        <ConfiguratorPreview appearance={appearance} autoRotate={autoRotate} />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-6 pt-24">
          <div className="glass pointer-events-auto rounded-sm px-4 py-3">
            <p className="eyebrow">Your Specification</p>
            <p className="mt-1.5 font-display text-xl text-ink-50">
              {find(STYLES, selections.style)?.label ?? "Custom"} ·{" "}
              {find(LEATHERS, selections.leather)?.label ?? ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            className="glass pointer-events-auto rounded-sm px-4 py-3 font-roman text-[0.6rem] uppercase tracking-[0.2em] text-ink-200 transition-colors hover:text-gold-200"
            aria-pressed={autoRotate}
          >
            {autoRotate ? "Pause" : "Rotate"}
          </button>
        </div>

        <p
          data-cursor="drag"
          className="absolute inset-x-0 bottom-6 text-center font-roman text-[0.58rem] uppercase tracking-[0.26em] text-ink-500"
        >
          Drag to rotate · Scroll to zoom
        </p>
      </div>

      {/* ---- Options ------------------------------------------------------ */}
      <div className="flex flex-col bg-ink-900">
        {/* Step rail */}
        <div className="sticky top-0 z-20 border-b border-hairline bg-ink-900/95 px-6 pt-24 backdrop-blur-xl lg:pt-8">
          <div className="flex gap-1 overflow-x-auto pb-4">
            {STEPS.map((s) => {
              const isActive = s.id === step;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "shrink-0 rounded-xs border px-3.5 py-2.5 text-left transition-colors duration-300",
                    isActive
                      ? "border-gold-300/50 bg-gold-300/10"
                      : "border-transparent hover:border-hairline",
                  )}
                >
                  <span
                    className={cn(
                      "block font-roman text-[0.55rem] tracking-[0.2em]",
                      isActive ? "text-gold-300" : "text-ink-500",
                    )}
                  >
                    {s.n}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block whitespace-nowrap text-[0.72rem]",
                      isActive ? "text-ink-50" : "text-ink-400",
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 px-6 py-9">
          {/* Keyed remount rather than AnimatePresence mode="wait".
              `mode="wait"` holds the incoming panel until the outgoing exit
              animation finishes, which makes the options unreachable whenever
              rAF is throttled — a background tab, battery saver, or a headless
              browser. Step content must never be gated on a frame arriving. */}
          <div>
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-11"
            >
              {stepGroups.map((group) => (
                <OptionGroupControl
                  key={group.id}
                  group={group}
                  selections={selections}
                  texts={texts}
                  onSelect={select}
                  onText={(id, v) => setTexts((p) => ({ ...p, [id]: v }))}
                  measurements={measurements}
                  onMeasure={(id, v) =>
                    setMeasurements((p) => ({ ...p, [id]: v }))
                  }
                  showMeasurements={isMadeToMeasure}
                />
              ))}

              {step === "fit" && (
                <div>
                  <label
                    htmlFor="instructions"
                    className="font-roman text-[0.62rem] uppercase tracking-[0.22em] text-ink-200"
                  >
                    Special instructions
                  </label>
                  <textarea
                    id="instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="Anything our pattern cutters should know."
                    className="mt-3 w-full rounded-xs border border-hairline bg-ink-850 p-4 text-sm text-ink-100 placeholder:text-ink-500 focus:border-gold-300/50 focus:outline-none"
                  />
                  <p className="mt-2 text-right text-[0.65rem] text-ink-500">
                    {instructions.length} / 1000
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* ---- Price summary --------------------------------------------- */}
        <div className="sticky bottom-0 border-t border-hairline bg-ink-850/97 backdrop-blur-xl">
          <div className="max-h-52 overflow-y-auto px-6 pt-5">
            <ul className="space-y-1.5">
              {breakdown.lineItems.map((item) => (
                <li
                  key={item.id + item.label}
                  className="flex items-baseline justify-between gap-4 text-[0.75rem]"
                >
                  <span className="text-ink-400">
                    {item.label}
                    {item.detail && (
                      <span className="text-ink-600"> · {item.detail}</span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums text-ink-300">
                    {formatPrice(item.cents)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2.5 px-6 py-4">
            {breakdown.bulkDiscountCents > 0 && (
              <Row
                label={`Bulk discount · ${breakdown.bulkTier.label}`}
                value={`− ${formatPrice(breakdown.bulkDiscountCents)}`}
                accent
              />
            )}
            {breakdown.couponDiscountCents > 0 && (
              <Row
                label={`Coupon · ${breakdown.couponCode}`}
                value={`− ${formatPrice(breakdown.couponDiscountCents)}`}
                accent
              />
            )}
            <Row
              label="Shipping"
              value={
                breakdown.shippingCents === 0
                  ? "Included"
                  : formatPrice(breakdown.shippingCents)
              }
            />

            <div className="flex items-end justify-between border-t border-hairline pt-4">
              <div>
                <p className="eyebrow">Total</p>
                <p className="mt-1 text-[0.68rem] text-ink-500">
                  Est. {breakdown.leadTimeDays} working days
                </p>
              </div>
              <motion.p
                key={breakdown.totalCents}
                initial={{ opacity: 0.5, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="font-display text-4xl tabular-nums text-gilt"
              >
                {formatPrice(breakdown.totalCents)}
              </motion.p>
            </div>

            <div className="flex gap-2 pt-1">
              <div className="flex items-center rounded-xs border border-hairline">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="px-3.5 py-2.5 text-ink-300 transition-colors hover:text-gold-200"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, Math.floor(Number(e.target.value) || 1)))
                  }
                  aria-label="Quantity"
                  className="w-14 bg-transparent text-center text-sm tabular-nums text-ink-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="px-3.5 py-2.5 text-ink-300 transition-colors hover:text-gold-200"
                >
                  +
                </button>
              </div>

              <input
                type="text"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Coupon"
                aria-label="Coupon code"
                className="min-w-0 flex-1 rounded-xs border border-hairline bg-transparent px-3.5 text-sm uppercase text-ink-100 placeholder:normal-case placeholder:text-ink-500 focus:border-gold-300/50 focus:outline-none"
              />

              <button
                type="button"
                onClick={reset}
                aria-label="Reset configuration"
                className="grid place-items-center rounded-xs border border-hairline px-3.5 text-ink-400 transition-colors hover:text-gold-200"
              >
                <RotateCcw size={15} />
              </button>
            </div>

            {breakdown.warnings.length > 0 && (
              <ul className="space-y-1 pt-1">
                {breakdown.warnings.map((w) => (
                  <li key={w} className="text-[0.68rem] text-gold-400">
                    {w}
                  </li>
                ))}
              </ul>
            )}

            <Button
              variant="gold"
              size="lg"
              className="mt-2 w-full"
              disabled={missing.length > 0 || submitting}
              onClick={() => setSubmitting(true)}
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={16} />
              ) : missing.length > 0 ? (
                `Choose ${missing[0].label}`
              ) : (
                "Review & Order"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between text-[0.75rem]">
      <span className={accent ? "text-gold-400" : "text-ink-400"}>{label}</span>
      <span
        className={cn("tabular-nums", accent ? "text-gold-300" : "text-ink-300")}
      >
        {value}
      </span>
    </div>
  );
}

function OptionGroupControl({
  group,
  selections,
  texts,
  onSelect,
  onText,
  measurements,
  onMeasure,
  showMeasurements,
}: {
  group: OptionGroup;
  selections: Selections;
  texts: Record<string, string>;
  onSelect: (groupId: string, optionId: string) => void;
  onText: (groupId: string, value: string) => void;
  measurements: Record<string, number>;
  onMeasure: (id: string, value: number) => void;
  showMeasurements: boolean;
}) {
  if (group.type === "measure") {
    if (!showMeasurements) return null;
    return (
      <fieldset>
        <legend className="font-roman text-[0.62rem] uppercase tracking-[0.22em] text-ink-200">
          {group.label} <span className="text-ink-500">(cm)</span>
        </legend>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {MEASUREMENTS.map((m) => (
            <div key={m.id}>
              <label
                htmlFor={`m-${m.id}`}
                className="block text-[0.68rem] text-ink-400"
              >
                {m.label}
              </label>
              <input
                id={`m-${m.id}`}
                type="number"
                min={m.min}
                max={m.max}
                value={measurements[m.id] ?? ""}
                onChange={(e) => onMeasure(m.id, Number(e.target.value))}
                className="mt-1.5 w-full rounded-xs border border-hairline bg-ink-850 px-3 py-2.5 text-sm tabular-nums text-ink-100 focus:border-gold-300/50 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </fieldset>
    );
  }

  if (group.type === "text") {
    const value = texts[group.id] ?? "";
    const charge = value.trim().replace(/\s+/g, "").length * (group.pricePerCharacter ?? 0);
    return (
      <div>
        <label
          htmlFor={`t-${group.id}`}
          className="font-roman text-[0.62rem] uppercase tracking-[0.22em] text-ink-200"
        >
          {group.label}
        </label>
        {group.helpText && (
          <p className="mt-1.5 text-[0.7rem] text-ink-500">{group.helpText}</p>
        )}
        <input
          id={`t-${group.id}`}
          type="text"
          value={value}
          maxLength={group.maxLength}
          onChange={(e) => onText(group.id, e.target.value)}
          className="mt-3 w-full rounded-xs border border-hairline bg-ink-850 px-4 py-3 text-sm uppercase tracking-wider text-ink-100 focus:border-gold-300/50 focus:outline-none"
        />
        <div className="mt-2 flex justify-between text-[0.65rem] text-ink-500">
          <span>
            {value.length} / {group.maxLength}
          </span>
          {charge > 0 && (
            <span className="text-gold-400">+ {formatPrice(charge)}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <fieldset>
      <legend className="font-roman text-[0.62rem] uppercase tracking-[0.22em] text-ink-200">
        {group.label}
        {!group.required && <span className="text-ink-500"> — optional</span>}
      </legend>
      {group.helpText && (
        <p className="mt-1.5 text-[0.7rem] text-ink-500">{group.helpText}</p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {group.options?.map((option) => {
          const selected = selections[group.id] === option.id;
          const priceLabel =
            option.price.kind === "add" && option.price.cents > 0
              ? `+ ${formatPrice(option.price.cents)}`
              : option.price.kind === "multiplyBase" && option.price.factor !== 1
                ? `${option.price.factor > 1 ? "+" : "−"}${Math.abs(
                    Math.round((option.price.factor - 1) * 100),
                  )}%`
                : "Included";

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(group.id, option.id)}
              aria-pressed={selected}
              disabled={option.soldOut}
              className={cn(
                "group relative rounded-xs border p-3.5 text-left transition-all duration-300",
                "disabled:cursor-not-allowed disabled:opacity-40",
                selected
                  ? "border-gold-300/60 bg-gold-300/8"
                  : "border-hairline hover:border-hairline-strong hover:bg-ink-850",
              )}
            >
              <div className="flex items-start gap-2.5">
                {option.swatch && (
                  <span
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 rounded-full border border-white/15"
                    style={{ backgroundColor: option.swatch }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-[0.8rem] leading-snug",
                      selected ? "text-ink-50" : "text-ink-200",
                    )}
                  >
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="mt-1 block text-[0.68rem] leading-snug text-ink-500">
                      {option.description}
                    </span>
                  )}
                  <span
                    className={cn(
                      "mt-1.5 block text-[0.65rem] tabular-nums",
                      selected ? "text-gold-300" : "text-ink-500",
                    )}
                  >
                    {priceLabel}
                    {option.leadTimeDays
                      ? ` · +${option.leadTimeDays}d`
                      : ""}
                  </span>
                </div>
                {selected && (
                  <Check size={14} className="mt-0.5 shrink-0 text-gold-300" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
