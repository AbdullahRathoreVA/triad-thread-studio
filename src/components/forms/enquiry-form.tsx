"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Mirrors `enquirySchema` on the server, minus the honeypot. */
const formSchema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(160).optional(),
  subject: z.string().trim().max(200).optional(),
  quantity: z.coerce.number().int().min(1).max(1_000_000).optional(),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more — at least 10 characters")
    .max(4000),
});

type FormValues = z.infer<typeof formSchema>;

export function EnquiryForm({
  type = "GENERAL",
  showQuantity = false,
  submitLabel = "Send enquiry",
}: {
  type?: "GENERAL" | "WHOLESALE" | "CUSTOM" | "SUPPORT";
  showQuantity?: boolean;
  submitLabel?: string;
}) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Honeypot value — kept in state rather than registered, so RHF ignores it. */
  const [website, setWebsite] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          quantity: showQuantity ? values.quantity : undefined,
          type,
          website: website || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "We could not send that message.");
        return;
      }
      setSent(true);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
  }

  if (sent) {
    return (
      <div className="rounded-sm border border-gold-300/30 bg-gold-300/5 p-9 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full border border-gold-300/40">
          <Check className="text-gold-300" size={19} />
        </div>
        <h3 className="mt-6 font-display text-2xl text-ink-50">Message sent</h3>
        <p className="mt-3 text-sm leading-relaxed text-ink-400">
          We read every enquiry ourselves and will reply personally.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      {/* Honeypot. Hidden from sight AND from assistive tech, never autofilled. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website-hp">Leave this field blank</label>
        <input
          id="website-hp"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <Field label="Name" error={errors.name?.message} {...register("name")} autoComplete="name" />
      <Field
        label="Email"
        type="email"
        error={errors.email?.message}
        {...register("email")}
        autoComplete="email"
      />
      <Field label="Phone" optional {...register("phone")} autoComplete="tel" />
      <Field
        label="Company"
        optional
        {...register("company")}
        autoComplete="organization"
      />

      {showQuantity ? (
        <Field
          label="Estimated quantity"
          type="number"
          min={1}
          optional
          error={errors.quantity?.message}
          {...register("quantity")}
        />
      ) : (
        <Field label="Subject" optional className="sm:col-span-2" {...register("subject")} />
      )}

      {showQuantity && <Field label="Subject" optional {...register("subject")} />}

      <div className="sm:col-span-2">
        <label htmlFor="enq-message" className="block text-[0.7rem] text-ink-400">
          Message
        </label>
        <textarea
          id="enq-message"
          rows={6}
          {...register("message")}
          aria-invalid={Boolean(errors.message)}
          className={cn(
            "mt-2 w-full rounded-xs border bg-ink-850 p-4 text-sm text-ink-100 placeholder:text-ink-600 focus:outline-none",
            errors.message
              ? "border-red-500/50 focus:border-red-500"
              : "border-hairline focus:border-gold-300/50",
          )}
          placeholder={
            showQuantity
              ? "Tell us what you need: product, quantity, target price, timeline, and whether you have a tech pack or sample."
              : "How can we help?"
          }
        />
        {errors.message && (
          <p className="mt-1.5 text-[0.68rem] text-red-400">{errors.message.message}</p>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xs border border-red-500/30 bg-red-500/8 p-3.5 text-[0.78rem] text-red-300 sm:col-span-2"
        >
          {error}
        </p>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" variant="gold" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : submitLabel}
        </Button>
      </div>
    </form>
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
  const id = `enq-${props.name ?? label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[0.7rem] text-ink-400">
        {label}
        {optional && <span className="text-ink-600"> — optional</span>}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(
          "mt-2 w-full rounded-xs border bg-ink-850 px-3.5 py-3 text-sm text-ink-100 focus:outline-none",
          error
            ? "border-red-500/50 focus:border-red-500"
            : "border-hairline focus:border-gold-300/50",
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-[0.68rem] text-red-400">{error}</p>}
    </div>
  );
}
