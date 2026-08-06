"use client";

import { useState, useTransition } from "react";
import type { OrderStatus } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { ALLOWED_TRANSITIONS, STATUS_LABEL } from "@/lib/orders/status";
import { updateOrderStatus } from "../actions";

/**
 * Status transitions.
 *
 * Only legal next states are offered. The same rule is enforced again inside
 * the server action — this is convenience, not the control.
 */
export function StatusControl({
  orderId,
  current,
}: {
  orderId: string;
  current: OrderStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);

  const next = ALLOWED_TRANSITIONS[current];

  function apply(status: OrderStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateOrderStatus({ orderId, status });
      if (!result.ok) setError(result.error);
      setConfirming(null);
    });
  }

  if (next.length === 0) {
    return (
      <p className="text-[0.75rem] text-ink-500">
        {STATUS_LABEL[current]} is a final state. Further changes must be made
        directly in the database, deliberately.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {next.map((status) => {
          // Destructive moves get a confirm step; routine progress does not.
          const destructive = status === "CANCELLED" || status === "REFUNDED";
          const isConfirming = confirming === status;

          return (
            <button
              key={status}
              type="button"
              disabled={pending}
              onClick={() =>
                destructive && !isConfirming ? setConfirming(status) : apply(status)
              }
              className={
                isConfirming
                  ? "rounded-xs border border-red-400/60 bg-red-500/10 px-4 py-2.5 text-[0.72rem] text-red-200 disabled:opacity-50"
                  : destructive
                    ? "rounded-xs border border-hairline px-4 py-2.5 text-[0.72rem] text-ink-400 transition-colors hover:border-red-400/50 hover:text-red-300 disabled:opacity-50"
                    : "rounded-xs border border-gold-300/40 bg-gold-300/8 px-4 py-2.5 text-[0.72rem] text-gold-100 transition-colors hover:border-gold-300 disabled:opacity-50"
              }
            >
              {pending && <Loader2 size={12} className="mr-1.5 inline animate-spin" />}
              {isConfirming
                ? `Confirm — mark ${STATUS_LABEL[status].toLowerCase()}`
                : `Mark ${STATUS_LABEL[status].toLowerCase()}`}
            </button>
          );
        })}

        {confirming && (
          <button
            type="button"
            onClick={() => setConfirming(null)}
            className="rounded-xs px-3 py-2.5 text-[0.72rem] text-ink-500 hover:text-ink-200"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[0.72rem] text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
