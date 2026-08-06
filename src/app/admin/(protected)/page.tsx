import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  IN_PRODUCTION: "In production",
  QUALITY_CHECK: "Quality check",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export default async function AdminOverview() {
  // A fresh install has no database yet. Showing setup instructions beats an
  // unexplained 500 on the very first page an operator ever sees.
  let data;
  try {
    const [orderCount, pendingCount, revenue, newEnquiries, recent] =
      await Promise.all([
        db.order.count(),
        db.order.count({ where: { status: "PENDING" } }),
        db.order.aggregate({
          _sum: { totalCents: true },
          where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
        }),
        db.enquiry.count({ where: { status: "NEW" } }),
        db.order.findMany({
          take: 8,
          orderBy: { createdAt: "desc" },
          include: { customer: { select: { email: true, name: true } } },
        }),
      ]);
    data = { orderCount, pendingCount, revenue, newEnquiries, recent };
  } catch (error) {
    console.error("[admin] database unavailable", error);
    return (
      <div className="max-w-lg">
        <h1 className="font-display text-3xl text-ink-50">Database not reachable</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-300">
          The admin dashboard needs a Postgres connection. Set{" "}
          <code className="text-gold-200">DATABASE_URL</code> and{" "}
          <code className="text-gold-200">DIRECT_URL</code> in your environment,
          then run:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xs border border-hairline bg-ink-900 p-4 text-[0.75rem] text-ink-200">
          npm run db:push{"\n"}npm run db:seed
        </pre>
        <p className="mt-4 text-[0.78rem] text-ink-500">
          Full walkthrough in docs/DEPLOYMENT.md.
        </p>
      </div>
    );
  }

  const stats = [
    { label: "Total orders", value: String(data.orderCount) },
    { label: "Awaiting action", value: String(data.pendingCount) },
    { label: "Booked revenue", value: formatPrice(data.revenue._sum.totalCents ?? 0) },
    { label: "New enquiries", value: String(data.newEnquiries) },
  ];

  return (
    <div>
      <h1 className="font-display text-4xl text-ink-50">Overview</h1>

      <dl className="mt-9 grid gap-px sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="border-t border-hairline pr-6 pt-5">
            <dt className="text-[0.7rem] text-ink-500">{stat.label}</dt>
            <dd className="mt-2 font-display text-3xl tabular-nums text-ink-50">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-16 font-display text-2xl text-ink-50">Recent orders</h2>

      {data.recent.length === 0 ? (
        <p className="mt-5 text-sm text-ink-500">
          No orders yet. They will appear here as they come in.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-[0.68rem] uppercase tracking-wider text-ink-500">
                <th scope="col" className="py-3 pr-4 font-normal">Order</th>
                <th scope="col" className="py-3 pr-4 font-normal">Customer</th>
                <th scope="col" className="py-3 pr-4 font-normal">Status</th>
                <th scope="col" className="py-3 pr-4 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((order) => (
                <tr key={order.id} className="border-b border-hairline/60">
                  <td className="py-3.5 pr-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="tabular-nums text-gold-200 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3.5 pr-4 text-ink-300">
                    {order.customer.name ?? order.customer.email}
                  </td>
                  <td className="py-3.5 pr-4 text-ink-400">
                    {STATUS_LABEL[order.status] ?? order.status}
                  </td>
                  <td className="py-3.5 pr-4 text-right tabular-nums text-ink-200">
                    {formatPrice(order.totalCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
