"use client";

import { useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Check, RotateCcw } from "lucide-react";
import {
  STEPS,
  BULK_TIERS,
  MEASUREMENTS,
  PRODUCT_TYPES,
  JERSEY_FABRICS,
  JERSEY_STYLES,
  groupsFor,
  stepsFor,
  type ProductType,
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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkout } from "./checkout";
import type { JacketAppearance } from "./jacket-model";
import type { JerseyAppearance } from "./jersey-model";

const ConfiguratorPreview = dynamic(
  () => import("./preview").then((m) => m.ConfiguratorPreview),
  { ssr: false },
);

/** Sensible opening spec so the buyer sees a complete jersey immediately. */
const JERSEY_DEFAULTS: Selections = {
  style: "football",
  fit: "athletic",
  fabric: "poly-interlock",
  sleeves: "short",
  collar: "crew",
  print: "front-back",
  numbers: "back",
  names: "none",
  size: "size-run",
};

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
  const [productType, setProductType] = useState<ProductType>("jacket");
  const [selections, setSelections] = useState<Selections>(DEFAULTS);
  /** Jersey colours are picked directly, not from a fixed leather palette. */
  const [jerseyColours, setJerseyColours] = useState({
    primary: "#8a1f22",
    secondary: "#f2eee7",
  });
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  const [instructions, setInstructions] = useState("");
  // Defaults to the trade minimum, not 1. This is a wholesale supplier: the
  // first number a buyer sees should already be a trade price, and a single
  // unit is the exception rather than the assumption.
  // Annotated `number`: BULK_TIERS is `as const`, so inference would otherwise
  // pin the state type to the literal 12 and reject every later update.
  const [quantity, setQuantity] = useState<number>(BULK_TIERS[1].minQty);
  const [coupon, setCoupon] = useState("");
  const [step, setStep] = useState<(typeof STEPS)[number]["id"]>("silhouette");
  const [autoRotate, setAutoRotate] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const select = useCallback((groupId: string, optionId: string) => {
    setSelections((prev) => ({ ...prev, [groupId]: optionId }));
  }, []);

  // Price recomputes synchronously on every keystroke. The engine is pure and
  // takes well under a millisecond, so there is no debounce and no flicker.
  const breakdown = useMemo(
    () =>
      calculatePrice({
        productType,
        selections,
        quantity,
        texts,
        couponCode: coupon || undefined,
      }),
    [productType, selections, quantity, texts, coupon],
  );

  /** Switching product resets to that product's own defaults. */
  const switchProduct = useCallback((next: ProductType) => {
    setProductType(next);
    setSelections(next === "jersey" ? JERSEY_DEFAULTS : DEFAULTS);
    setTexts({});
    setMeasurements({});
    setStep("silhouette");
  }, []);

  const jerseyAppearance: JerseyAppearance = useMemo(() => {
    const fabric = find(JERSEY_FABRICS, selections.fabric);
    return {
      primaryColour: jerseyColours.primary,
      secondaryColour: jerseyColours.secondary,
      fabricWeave: fabric?.id === "poly-mesh" ? 7 : fabric?.id === "poly-spandex" ? 4 : 5,
      mesh: fabric?.id === "poly-mesh",
      sleeve: (selections.sleeves as string) ?? "short",
      collar: (selections.collar as string) ?? "crew",
    };
  }, [selections, jerseyColours]);

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

  /** How much of the spec the buyer has actually filled in. */
  const chosenCount = useMemo(
    () =>
      Object.values(selections).filter(Boolean).length +
      Object.values(texts).filter((t) => t?.trim()).length,
    [selections, texts],
  );

  const activeGroups = groupsFor(productType);
  const activeSteps = useMemo(() => stepsFor(productType), [productType]);
  const stepGroups = activeGroups.filter((g) => g.step === step);
  const missing = missingRequired(selections, productType);
  const isMadeToMeasure = selections.size === "made-to-measure";

  const reset = () => {
    setSelections(productType === "jersey" ? JERSEY_DEFAULTS : DEFAULTS);
    setTexts({});
    setMeasurements({});
    setInstructions("");
    setQuantity(BULK_TIERS[1].minQty);
    setCoupon("");
  };

  // Desktop is a fixed-height, two-pane workspace that never scrolls as a page.
  // The options column owns its own scroll, so the price bar sits at the bottom
  // of the flex column instead of being `sticky` and painting over the options
  // beneath it — which is what caused the overlapping panels.
  //
  // `h-[calc(100svh-74px)]` subtracts the fixed nav, and `min-h-0` on the
  // scrolling child is what actually lets it scroll: without it a flex item
  // defaults to min-height:auto and grows past its parent instead.
  return (
    <div className="lg:grid lg:h-[calc(100svh-74px)] lg:grid-cols-[1fr_minmax(430px,38%)] lg:overflow-hidden">
      {/* ---- Preview ------------------------------------------------------ */}
      <div className="relative h-[52svh] border-b border-hairline bg-ink-950 lg:h-full lg:border-b-0 lg:border-r">
        <ConfiguratorPreview
          productType={productType}
          appearance={appearance}
          jerseyAppearance={jerseyAppearance}
          autoRotate={autoRotate}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-6 pt-24">
          <div className="glass pointer-events-auto rounded-sm px-4 py-3">
            <p className="eyebrow">Your Specification</p>
            <p className="mt-1.5 font-display text-xl text-ink-50">
              {productType === "jersey"
                ? `${find(JERSEY_STYLES, selections.style)?.label ?? "Jersey"} · ${
                    find(JERSEY_FABRICS, selections.fabric)?.label ?? ""
                  }`
                : `${find(STYLES, selections.style)?.label ?? "Custom"} · ${
                    find(LEATHERS, selections.leather)?.label ?? ""
                  }`}
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
      <div className="flex flex-col bg-ink-900 lg:h-full lg:min-h-0">
        {/* Step rail — a flex sibling, not sticky, so it cannot overlap. */}
        <div className="shrink-0 border-b border-hairline bg-ink-900 px-6 pt-5">
          {/* Product switch — the two lines have completely different option
              sets, pricing and 3D models, so this resets rather than merges. */}
          <div
            role="tablist"
            aria-label="Product type"
            className="mb-4 flex gap-1 rounded-xs border border-hairline p-1"
          >
            {PRODUCT_TYPES.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={productType === p.id}
                type="button"
                onClick={() => switchProduct(p.id)}
                className={cn(
                  "flex-1 rounded-xs px-3 py-2 text-[0.72rem] transition-colors",
                  productType === p.id
                    ? "bg-gold-300/12 text-gold-100"
                    : "text-ink-400 hover:text-ink-100",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeSteps.map((s) => {
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

        <div className="flex-1 overflow-y-auto px-6 py-8 lg:min-h-0">
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
              {/* Team colours are free-choice, not a fixed palette — a club
                  has its own colours and will not accept the nearest match. */}
              {productType === "jersey" && step === "material" && (
                <fieldset>
                  <legend className="font-roman text-[0.62rem] uppercase tracking-[0.22em] text-ink-200">
                    Team colours
                  </legend>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {(
                      [
                        { key: "primary", label: "Primary" },
                        { key: "secondary", label: "Trim & collar" },
                      ] as const
                    ).map(({ key, label }) => (
                      <label
                        key={key}
                        className="flex items-center gap-3 rounded-xs border border-hairline p-3"
                      >
                        <input
                          type="color"
                          value={jerseyColours[key]}
                          onChange={(e) =>
                            setJerseyColours((c) => ({ ...c, [key]: e.target.value }))
                          }
                          className="size-8 cursor-pointer rounded-xs border-0 bg-transparent p-0"
                          aria-label={`${label} colour`}
                        />
                        <span className="text-[0.75rem] text-ink-200">
                          {label}
                          <span className="mt-0.5 block font-mono text-[0.62rem] uppercase text-ink-500">
                            {jerseyColours[key]}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-[0.68rem] text-ink-500">
                    Sublimation reproduces any colour, so these are exact — send
                    us Pantone references and we will match them on press.
                  </p>
                </fieldset>
              )}

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

        {/* ---- Price summary ---------------------------------------------
            Collapsed by default. The itemised breakdown used to sit here
            permanently and consumed roughly 60% of the panel, squeezing the
            options list — the part actually being used — into a sliver. The
            same breakdown is shown in full on the checkout review screen, so
            keeping a second permanent copy here bought nothing.            */}
        <div className="shrink-0 border-t border-hairline bg-ink-850">
          <div className="space-y-2 px-6 pb-4 pt-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="eyebrow">Your specification</p>
                <p className="mt-1.5 text-[0.72rem] leading-snug text-ink-400">
                  {chosenCount} option{chosenCount === 1 ? "" : "s"} set
                </p>
                <p className="mt-0.5 text-[0.68rem] text-ink-500">
                  Est. {breakdown.leadTimeDays} working days production
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl tabular-nums text-gilt">
                  {quantity.toLocaleString()}
                </p>
                <p className="text-[0.66rem] text-ink-500">units</p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <div className="flex flex-1 items-center rounded-xs border border-hairline">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="px-4 py-2.5 text-ink-300 transition-colors hover:text-gold-200"
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
                  className="w-full bg-transparent text-center text-sm tabular-nums text-ink-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="px-4 py-2.5 text-ink-300 transition-colors hover:text-gold-200"
                >
                  +
                </button>
              </div>

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
              size="md"
              className="mt-1 w-full"
              disabled={missing.length > 0}
              onClick={() => setCheckoutOpen(true)}
            >
              {missing.length > 0
                ? `Choose ${missing[0].label}`
                : "Request a Quote"}
            </Button>

            <p className="pt-1 text-center text-[0.64rem] leading-relaxed text-ink-600">
              Every run is priced individually — hides, quantity and freight all
              move the number. An owner replies with a firm quote.
            </p>
          </div>
        </div>
      </div>

      {checkoutOpen && (
        <Checkout
          selections={selections}
          texts={texts}
          measurements={measurements}
          instructions={instructions}
          quantity={quantity}
          couponCode={coupon}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
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
        <p className="mt-2 text-right text-[0.65rem] text-ink-500">
          {value.length} / {group.maxLength}
        </p>
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
          // No prices on the public site — an owner quotes each run. What a
          // buyer still needs from an option is whether it delays production.
          const noteLabel = option.leadTimeDays
            ? `Adds ${option.leadTimeDays} days`
            : null;

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
                  {noteLabel && (
                    <span
                      className={cn(
                        "mt-1.5 block text-[0.65rem]",
                        selected ? "text-gold-300" : "text-ink-500",
                      )}
                    >
                      {noteLabel}
                    </span>
                  )}
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
