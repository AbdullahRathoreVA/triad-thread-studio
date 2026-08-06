"use client";

import { useState, useTransition } from "react";
import { EnquiryStatus, EnquiryType } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { setEnquiryStatus } from "./actions";

const TYPE_LABEL: Record<EnquiryType, string> = {
  GENERAL: "General",
  WHOLESALE: "Wholesale",
  CUSTOM: "Custom",
  SUPPORT: "Support",
};

const STATUS_ORDER: EnquiryStatus[] = ["NEW", "READ", "REPLIED", "CLOSED"];

export function EnquiryCard({
  enquiry,
}: {
  enquiry: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    subject: string | null;
    message: string;
    quantity: number | null;
    type: EnquiryType;
    status: EnquiryStatus;
    createdAt: string;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(enquiry.status);
  const [error, setError] = useState<string | null>(null);

  function move(next: EnquiryStatus) {
    setError(null);
    const previous = status;
    // Optimistic: the operator is triaging a list and should not wait on a
    // round trip per click. Reverted if the server refuses.
    setStatus(next);
    startTransition(async () => {
      const result = await setEnquiryStatus({ id: enquiry.id, status: next });
      if (!result.ok) {
        setStatus(previous);
        setError(result.error ?? "Could not update.");
      }
    });
  }

  const isWholesale = enquiry.type === "WHOLESALE";

  return (
    <article
      className={cn(
        "rounded-sm border p-6 transition-colors",
        status === "NEW"
          ? "border-gold-300/35 bg-gold-300/4"
          : "border-hairline bg-ink-900",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-xl text-ink-50">{enquiry.name}</h2>
            <span
              className={cn(
                "rounded-xs border px-2 py-0.5 font-roman text-[0.55rem] uppercase tracking-[0.16em]",
                isWholesale
                  ? "border-gold-300/45 text-gold-200"
                  : "border-hairline text-ink-400",
              )}
            >
              {TYPE_LABEL[enquiry.type]}
            </span>
            {enquiry.quantity && (
              <span className="font-roman text-[0.6rem] tracking-[0.14em] text-gold-300">
                {enquiry.quantity.toLocaleString()} UNITS
              </span>
            )}
          </div>

          <p className="mt-1.5 text-[0.78rem] text-ink-400">
            <a
              href={`mailto:${enquiry.email}`}
              className="text-gold-200 hover:underline"
            >
              {enquiry.email}
            </a>
            {enquiry.company && <span> · {enquiry.company}</span>}
            {enquiry.phone && <span> · {enquiry.phone}</span>}
          </p>
        </div>

        <time className="shrink-0 text-[0.72rem] tabular-nums text-ink-600">
          {new Date(enquiry.createdAt).toLocaleString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>

      {enquiry.subject && (
        <p className="mt-4 text-[0.82rem] font-medium text-ink-100">
          {enquiry.subject}
        </p>
      )}

      <p className="mt-3 whitespace-pre-wrap text-[0.84rem] leading-[1.8] text-ink-300">
        {enquiry.message}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-hairline pt-5">
        {pending && <Loader2 size={13} className="animate-spin text-ink-500" />}
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => move(s)}
            disabled={pending || status === s}
            aria-pressed={status === s}
            className={cn(
              "rounded-xs border px-3 py-1.5 text-[0.68rem] transition-colors disabled:cursor-default",
              status === s
                ? "border-gold-300/50 bg-gold-300/10 text-gold-100"
                : "border-hairline text-ink-400 hover:text-ink-100",
            )}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}

        <a
          href={`mailto:${enquiry.email}?subject=${encodeURIComponent(
            `Re: ${enquiry.subject ?? "Your enquiry"} — Triad Thread Studio`,
          )}`}
          className="ml-auto rounded-xs border border-gold-300/40 bg-gold-300/8 px-4 py-1.5 text-[0.68rem] text-gold-100 transition-colors hover:border-gold-300"
        >
          Reply
        </a>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[0.7rem] text-red-400">
          {error}
        </p>
      )}
    </article>
  );
}
