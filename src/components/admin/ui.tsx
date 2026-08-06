import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

export function PageHeading({
  title,
  subtitle,
  back,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-9">
      {back && (
        <Link
          href={back.href}
          className="font-roman text-[0.6rem] uppercase tracking-[0.22em] text-ink-500 transition-colors hover:text-gold-200"
        >
          ← {back.label}
        </Link>
      )}
      <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="font-display text-4xl text-ink-50">{title}</h1>
          {subtitle && <p className="mt-2 text-[0.8rem] text-ink-500">{subtitle}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-xs border px-2.5 py-1 font-roman text-[0.58rem] uppercase tracking-[0.16em]",
        STATUS_STYLE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-sm border border-dashed border-hairline py-16 text-center">
      <p className="font-display text-xl text-ink-200">{title}</p>
      <p className="mx-auto mt-3 max-w-sm text-[0.82rem] leading-relaxed text-ink-500">
        {body}
      </p>
    </div>
  );
}

/**
 * Shown when Prisma cannot reach Postgres. A dedicated panel beats an
 * unexplained 500 — the operator needs to know it is infrastructure, not
 * their data.
 */
export function DatabaseDown() {
  return (
    <div className="max-w-lg rounded-sm border border-red-500/25 bg-red-500/5 p-7">
      <h2 className="font-display text-2xl text-ink-50">
        Database not reachable
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-ink-300">
        This screen needs a Postgres connection. Check{" "}
        <code className="text-gold-200">DATABASE_URL</code>, then run:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-xs border border-hairline bg-ink-900 p-4 text-[0.75rem] text-ink-200">
        npm run db:push
      </pre>
      <p className="mt-4 text-[0.78rem] text-ink-500">
        Full walkthrough in docs/DEPLOYMENT.md.
      </p>
    </div>
  );
}

export function DataTable({
  headers,
  children,
  minWidth = 720,
}: {
  headers: { label: string; align?: "left" | "right" }[];
  children: React.ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-hairline">
            {headers.map((h) => (
              <th
                key={h.label}
                scope="col"
                className={cn(
                  "pb-3.5 font-roman text-[0.58rem] font-normal uppercase tracking-[0.18em] text-ink-500",
                  h.align === "right" && "text-right",
                )}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
