"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { X, Loader2, Check, AlertTriangle } from "lucide-react";
import {
  checkoutFormSchema,
  type CheckoutFormValues,
} from "@/lib/validation/order";
import { calculatePrice, type Selections } from "@/lib/pricing/engine";
import { OPTION_GROUPS, MEASUREMENTS } from "@/config/configurator";
import { formatPrice, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  selections: Selections;
  texts: Record<string, string>;
  measurements: Record<string, number>;
  instructions: string;
  quantity: number;
  couponCode: string;
  onClose: () => void;
};

type Confirmation = {
  orderNumber: string;
  designCode: string;
  totalCents: number;
  leadTimeDays: number;
  estimatedShipAt: string | null;
};

/** Human-readable label for a stored option id. */
function labelFor(groupId: string, optionId: unknown): string | null {
  const group = OPTION_GROUPS.find((g) => g.id === groupId);
  const option = group?.options?.find((o) => o.id === optionId);
  return option ? option.label : null;
}

export function Checkout({
  selections,
  texts,
  measurements,
  instructions,
  quantity,
  couponCode,
  onClose,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /** Set when the server recomputes a different total (409). */
  const [repricedTo, setRepricedTo] = useState<number | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      destination: "domestic",
      specialInstructions: instructions || undefined,
      customer: { name: "", email: "", phone: "", company: "" },
      shipping: {
        name: "",
        line1: "",
        line2: "",
        city: "",
        region: "",
        postal: "",
        country: "",
      },
    },
  });

  // Destination changes shipping cost, so the total shown here must be
  // recomputed from it — otherwise the figure we send will not match what
  // the server derives and every order 409s.
  //
  // `useWatch` rather than `form.watch()`: the latter returns a fresh function
  // each render, which makes React Compiler bail out of memoising this entire
  // component. `useWatch` is a real subscription and stays compiler-friendly.
  const destination = useWatch({
    control: form.control,
    name: "destination",
    defaultValue: "domestic",
  });

  const breakdown = useMemo(
    () =>
      calculatePrice({
        selections,
        quantity,
        texts,
        couponCode: couponCode || undefined,
        destination,
      }),
    [selections, quantity, texts, couponCode, destination],
  );

  const specRows = useMemo(
    () =>
      OPTION_GROUPS.filter((g) => g.type === "single")
        .map((g) => ({ label: g.label, value: labelFor(g.id, selections[g.id]) }))
        .filter((row): row is { label: string; value: string } => Boolean(row.value)),
    [selections],
  );

  const measurementRows = MEASUREMENTS.filter(
    (m) => typeof measurements[m.id] === "number" && measurements[m.id] > 0,
  );

  async function onSubmit(values: CheckoutFormValues) {
    setSubmitting(true);
    setFormError(null);
    setRepricedTo(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selections,
          texts: Object.fromEntries(
            Object.entries(texts).filter(([, v]) => v?.trim()),
          ),
          measurements: Object.fromEntries(
            Object.entries(measurements).filter(([, v]) => typeof v === "number" && v > 0),
          ),
          quantity,
          couponCode: couponCode || undefined,
          destination: values.destination,
          specialInstructions: values.specialInstructions || undefined,
          customer: values.customer,
          shipping: values.shipping,
        }),
      });

      const data = await response.json();

      if (response.status === 409 && data.code === "PRICE_MISMATCH") {
        // Never silently re-charge. Show the server's figure and make the
        // customer agree to it before anything is written.
        setRepricedTo(data.actualTotalCents);
        return;
      }

      if (!response.ok) {
        setFormError(
          data.issues?.length
            ? `Please check: ${data.issues.map((i: { field: string }) => i.field).join(", ")}`
            : (data.error ?? "We could not place that order."),
        );
        return;
      }

      setConfirmation(data);
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Confirmation                                                     */
  /* ---------------------------------------------------------------- */
  if (confirmation) {
    const ship = confirmation.estimatedShipAt
      ? new Date(confirmation.estimatedShipAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : `${confirmation.leadTimeDays} working days`;

    return (
      <Shell onClose={onClose} title="Request received">
        <div className="mx-auto max-w-md py-10 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full border border-gold-300/40">
            <Check className="text-gold-300" size={22} />
          </div>

          <h3 className="mt-8 font-display text-3xl text-ink-50">
            Thank you — we have your specification.
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-ink-400">
            A copy has been sent to your email. An owner will review the
            specification and reply with a firm quote, usually the same working
            day.
          </p>

          <dl className="mt-9 divide-y divide-hairline border-y border-hairline text-left">
            <Row label="Reference" value={confirmation.orderNumber} mono />
            <Row label="Design reference" value={confirmation.designCode} mono />
                        <Row label="Est. production" value={ship} />
          </dl>

          <Button variant="outline" className="mt-9" onClick={onClose}>
            Close
          </Button>
        </div>
      </Shell>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Review + form                                                    */
  /* ---------------------------------------------------------------- */
  return (
    <Shell onClose={onClose} title="Review your specification">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-12 py-8 lg:grid-cols-[1fr_380px]"
      >
        {/* ---- Details ------------------------------------------------ */}
        <div className="order-2 space-y-10 lg:order-1">
          <Fieldset legend="Your details">
            <Field
              label="Full name"
              error={form.formState.errors.customer?.name?.message}
              {...form.register("customer.name")}
              autoComplete="name"
            />
            <Field
              label="Email"
              type="email"
              error={form.formState.errors.customer?.email?.message}
              {...form.register("customer.email")}
              autoComplete="email"
            />
            <Field
              label="Phone"
              optional
              error={form.formState.errors.customer?.phone?.message}
              {...form.register("customer.phone")}
              autoComplete="tel"
            />
            <Field
              label="Company"
              optional
              error={form.formState.errors.customer?.company?.message}
              {...form.register("customer.company")}
              autoComplete="organization"
            />
          </Fieldset>

          <Fieldset legend="Delivery address">
            <Field
              label="Recipient"
              error={form.formState.errors.shipping?.name?.message}
              {...form.register("shipping.name")}
              autoComplete="shipping name"
            />
            <Field
              label="Address line 1"
              className="sm:col-span-2"
              error={form.formState.errors.shipping?.line1?.message}
              {...form.register("shipping.line1")}
              autoComplete="shipping address-line1"
            />
            <Field
              label="Address line 2"
              optional
              className="sm:col-span-2"
              {...form.register("shipping.line2")}
              autoComplete="shipping address-line2"
            />
            <Field
              label="City"
              error={form.formState.errors.shipping?.city?.message}
              {...form.register("shipping.city")}
              autoComplete="shipping address-level2"
            />
            <Field
              label="State / region"
              optional
              {...form.register("shipping.region")}
              autoComplete="shipping address-level1"
            />
            <Field
              label="Postal code"
              error={form.formState.errors.shipping?.postal?.message}
              {...form.register("shipping.postal")}
              autoComplete="shipping postal-code"
            />
            <Field
              label="Country"
              error={form.formState.errors.shipping?.country?.message}
              {...form.register("shipping.country")}
              autoComplete="shipping country-name"
            />

            <div className="sm:col-span-2">
              <span className="block text-[0.7rem] text-ink-400">Shipping</span>
              <div className="mt-2 flex gap-2">
                {(["domestic", "international"] as const).map((value) => (
                  <label
                    key={value}
                    className={cn(
                      "flex-1 cursor-pointer rounded-xs border px-4 py-3 text-[0.78rem] capitalize transition-colors",
                      destination === value
                        ? "border-gold-300/60 bg-gold-300/8 text-ink-50"
                        : "border-hairline text-ink-300 hover:border-hairline-strong",
                    )}
                  >
                    <input
                      type="radio"
                      value={value}
                      className="sr-only"
                      {...form.register("destination")}
                    />
                    {value}
                  </label>
                ))}
              </div>
            </div>
          </Fieldset>

          <div>
            <label
              htmlFor="checkout-instructions"
              className="block text-[0.7rem] text-ink-400"
            >
              Special instructions <span className="text-ink-600">— optional</span>
            </label>
            <textarea
              id="checkout-instructions"
              rows={3}
              maxLength={1000}
              {...form.register("specialInstructions")}
              className="mt-2 w-full rounded-xs border border-hairline bg-ink-850 p-3.5 text-sm text-ink-100 placeholder:text-ink-600 focus:border-gold-300/50 focus:outline-none"
              placeholder="Anything our pattern cutters should know."
            />
          </div>
        </div>

        {/* ---- Summary ------------------------------------------------ */}
        <aside className="order-1 lg:order-2">
          <div className="rounded-sm border border-hairline bg-ink-850 p-6">
            <p className="eyebrow">Your specification</p>

            <dl className="mt-5 space-y-1.5">
              {specRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-4 text-[0.75rem]">
                  <dt className="text-ink-500">{row.label}</dt>
                  <dd className="text-right text-ink-200">{row.value}</dd>
                </div>
              ))}
              {Object.entries(texts)
                .filter(([, v]) => v?.trim())
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 text-[0.75rem]">
                    <dt className="text-ink-500">
                      {OPTION_GROUPS.find((g) => g.id === key)?.label ?? key}
                    </dt>
                    <dd className="text-right uppercase text-gold-200">{value}</dd>
                  </div>
                ))}
            </dl>

            {measurementRows.length > 0 && (
              <>
                <p className="eyebrow mt-7">Measurements (cm)</p>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {measurementRows.map((m) => (
                    <div key={m.id} className="flex justify-between text-[0.72rem]">
                      <dt className="text-ink-500">{m.label}</dt>
                      <dd className="tabular-nums text-ink-200">{measurements[m.id]}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            <div className="mt-7 space-y-2 border-t border-hairline pt-5 text-[0.75rem]">
              <SummaryRow label="Quantity" value={breakdown.quantity.toLocaleString()} />
              <SummaryRow
                label="Est. production"
                value={`${breakdown.leadTimeDays} working days`}
              />
              <SummaryRow
                label="Delivery"
                value={destination === "domestic" ? "Domestic" : "International"}
              />
            </div>

            <p className="mt-6 border-t border-hairline pt-5 text-[0.75rem] leading-relaxed text-ink-400">
              We price each run individually. Hide availability, quantity,
              finishing and freight all move the number, so an owner reviews
              this specification and sends you a firm quote — usually the same
              working day.
            </p>
          </div>

          {repricedTo !== null && (
            <div
              role="alert"
              className="mt-4 rounded-xs border border-gold-300/40 bg-gold-300/8 p-4"
            >
              <p className="flex items-start gap-2.5 text-[0.78rem] leading-relaxed text-gold-100">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>
                  Pricing changed while you were designing. The current total is{" "}
                  <strong className="tabular-nums">{formatPrice(repricedTo)}</strong>.
                  Submit again to order at that price.
                </span>
              </p>
            </div>
          )}

          {formError && (
            <p
              role="alert"
              className="mt-4 rounded-xs border border-red-500/30 bg-red-500/8 p-4 text-[0.78rem] text-red-300"
            >
              {formError}
            </p>
          )}

          <Button
            type="submit"
            variant="gold"
            size="lg"
            className="mt-5 w-full"
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : repricedTo !== null ? (
              "Confirm at new price"
            ) : (
              "Send quote request"
            )}
          </Button>

          <p className="mt-3 text-center text-[0.68rem] leading-relaxed text-ink-600">
            No payment is taken and nothing is committed. This sends your
            specification for pricing.
          </p>
        </aside>
      </form>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Presentational helpers                                             */
/* ------------------------------------------------------------------ */

function Shell({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-200 overflow-y-auto bg-ink-950"
    >
      <div className="container-luxe">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-ink-950/95 py-5 backdrop-blur-xl">
          <h2 className="font-display text-2xl text-ink-50">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-10 place-items-center rounded-xs border border-hairline text-ink-300 transition-colors hover:text-gold-200"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

function Fieldset({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="font-roman text-[0.62rem] uppercase tracking-[0.22em] text-ink-200">
        {legend}
      </legend>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  error,
  optional,
  className,
  ...props
}: {
  label: string;
  error?: string;
  optional?: boolean;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `f-${props.name ?? label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[0.7rem] text-ink-400">
        {label}
        {optional && <span className="text-ink-600"> — optional</span>}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cn(
          "mt-2 w-full rounded-xs border bg-ink-850 px-3.5 py-3 text-sm text-ink-100 focus:outline-none",
          error
            ? "border-red-500/50 focus:border-red-500"
            : "border-hairline focus:border-gold-300/50",
        )}
        {...props}
      />
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-[0.68rem] text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 py-3.5">
      <dt className="text-[0.75rem] text-ink-500">{label}</dt>
      <dd className={cn("text-[0.8rem] text-ink-100", mono && "tabular-nums")}>
        {value}
      </dd>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className={accent ? "text-gold-400" : "text-ink-400"}>{label}</span>
      <span className={cn("tabular-nums", accent ? "text-gold-300" : "text-ink-300")}>
        {value}
      </span>
    </div>
  );
}
