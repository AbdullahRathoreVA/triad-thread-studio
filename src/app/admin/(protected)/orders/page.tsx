import Link from "next/link";
import { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatPrice, cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/orders/status";
import {
  PageHeading,
  StatusPill,
  EmptyState,
  DatabaseDown,
  DataTable,
  formatDate,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type Search = Promise<{ status?: string; q?: string; page?: string }>;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const params = await searchParams;

  // Validate the filter against the enum rather than trusting the query string
  // straight into a Prisma `where`.
  const status =
    params.status && params.status in OrderStatus
      ? (params.status as OrderStatus)
      : undefined;

  const query = (params.q ?? "").trim().slice(0, 120);
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(query
      ? {
          OR: [
            { orderNumber: { contains: query, mode: "insensitive" } },
            { customer: { email: { contains: query, mode: "insensitive" } } },
            { customer: { name: { contains: query, mode: "insensitive" } } },
            { shippingName: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  let data;
  try {
    const [orders, total, counts] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { customer: { select: { name: true, email: true } } },
      }),
      db.order.count({ where }),
      db.order.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    data = { orders, total, counts };
  } catch (error) {
    console.error("[admin/orders] database unavailable", error);
    return (
      <>
        <PageHeading title="Orders" />
        <DatabaseDown />
      </>
    );
  }

  const countFor = (s: OrderStatus) =>
    data.counts.find((c) => c.status === s)?._count._all ?? 0;

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const buildHref = (next: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { status, q: query || undefined, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, String(v));
    const qs = sp.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeading
        title="Orders"
        subtitle={`${data.total} ${data.total === 1 ? "order" : "orders"}${
          status ? ` · ${STATUS_LABEL[status]}` : ""
        }`}
      />

      {/* Filters */}
      <div className="mb-7 flex flex-wrap items-center gap-2">
        <Link
          href={buildHref({ status: undefined, page: undefined })}
          className={cn(
            "rounded-xs border px-3 py-1.5 text-[0.72rem] transition-colors",
            !status
              ? "border-gold-300/50 bg-gold-300/8 text-ink-50"
              : "border-hairline text-ink-400 hover:text-ink-100",
          )}
        >
          All
        </Link>
        {Object.values(OrderStatus).map((s) => {
          const count = countFor(s);
          return (
            <Link
              key={s}
              href={buildHref({ status: s, page: undefined })}
              className={cn(
                "rounded-xs border px-3 py-1.5 text-[0.72rem] transition-colors",
                status === s
                  ? "border-gold-300/50 bg-gold-300/8 text-ink-50"
                  : "border-hairline text-ink-400 hover:text-ink-100",
                count === 0 && status !== s && "opacity-45",
              )}
            >
              {STATUS_LABEL[s]}
              <span className="ml-1.5 tabular-nums text-ink-600">{count}</span>
            </Link>
          );
        })}
      </div>

      {/* Search — a GET form so the URL stays shareable and bookmarkable. */}
      <form method="get" className="mb-8 flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Order number, customer name or email"
          aria-label="Search orders"
          className="w-full max-w-sm rounded-xs border border-hairline bg-ink-850 px-3.5 py-2.5 text-sm text-ink-100 placeholder:text-ink-600 focus:border-gold-300/50 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xs border border-hairline px-4 text-[0.72rem] text-ink-300 transition-colors hover:border-gold-300/50 hover:text-gold-200"
        >
          Search
        </button>
        {query && (
          <Link
            href={buildHref({ q: undefined, page: undefined })}
            className="grid place-items-center rounded-xs border border-hairline px-4 text-[0.72rem] text-ink-500 hover:text-ink-200"
          >
            Clear
          </Link>
        )}
      </form>

      {data.orders.length === 0 ? (
        <EmptyState
          title={query || status ? "No matching orders" : "No orders yet"}
          body={
            query || status
              ? "Try clearing the filters or searching a different term."
              : "Orders placed through the Custom Studio will appear here automatically."
          }
        />
      ) : (
        <>
          <DataTable
            headers={[
              { label: "Order" },
              { label: "Customer" },
              { label: "Placed" },
              { label: "Dispatch" },
              { label: "Status" },
              { label: "Total", align: "right" },
            ]}
          >
            {data.orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-hairline/60 transition-colors hover:bg-ink-850/60"
              >
                <td className="py-3.5 pr-4">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="tabular-nums text-gold-200 hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="py-3.5 pr-4">
                  <span className="block text-ink-200">
                    {order.customer.name ?? "—"}
                  </span>
                  <span className="block text-[0.72rem] text-ink-500">
                    {order.customer.email}
                  </span>
                </td>
                <td className="py-3.5 pr-4 text-[0.8rem] text-ink-400">
                  {formatDate(order.createdAt)}
                </td>
                <td className="py-3.5 pr-4 text-[0.8rem] text-ink-400">
                  {formatDate(order.estimatedShipAt)}
                </td>
                <td className="py-3.5 pr-4">
                  <StatusPill status={order.status} />
                </td>
                <td className="py-3.5 text-right tabular-nums text-ink-200">
                  {formatPrice(order.totalCents, order.currency)}
                </td>
              </tr>
            ))}
          </DataTable>

          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-8 flex items-center justify-between text-[0.78rem]"
            >
              <span className="text-ink-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={buildHref({ page: String(page - 1) })}
                    className="rounded-xs border border-hairline px-4 py-2 text-ink-300 hover:text-gold-200"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={buildHref({ page: String(page + 1) })}
                    className="rounded-xs border border-hairline px-4 py-2 text-ink-300 hover:text-gold-200"
                  >
                    Next
                  </Link>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </>
  );
}
