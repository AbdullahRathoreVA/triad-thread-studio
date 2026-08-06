import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import { OPTION_GROUPS, MEASUREMENTS } from "@/config/configurator";
import {
  PageHeading,
  StatusPill,
  DatabaseDown,
  formatDate,
  formatDateTime,
} from "@/components/admin/ui";
import { StatusControl } from "./status-control";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Resolve a stored option id back to its human label. */
function labelFor(groupId: string, optionId: unknown): string {
  const group = OPTION_GROUPS.find((g) => g.id === groupId);
  const option = group?.options?.find((o) => o.id === optionId);
  return option?.label ?? String(optionId ?? "—");
}

function groupLabel(groupId: string): string {
  return OPTION_GROUPS.find((g) => g.id === groupId)?.label ?? groupId;
}

export default async function OrderDetailPage({ params }: Params) {
  const { id } = await params;

  let order;
  try {
    order = await db.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { customDesign: true, product: true } },
      },
    });
  } catch (error) {
    console.error("[admin/order] database unavailable", error);
    return (
      <>
        <PageHeading title="Order" back={{ href: "/admin/orders", label: "All orders" }} />
        <DatabaseDown />
      </>
    );
  }

  if (!order) notFound();

  const auditTrail = await db.auditLog
    .findMany({
      where: { entity: "Order", entityId: order.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    .catch(() => []);

  return (
    <>
      <PageHeading
        title={order.orderNumber}
        subtitle={`Placed ${formatDateTime(order.createdAt)}`}
        back={{ href: "/admin/orders", label: "All orders" }}
      >
        <StatusPill status={order.status} />
      </PageHeading>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-10">
          {/* ---- Status ------------------------------------------------- */}
          <section className="rounded-sm border border-hairline bg-ink-900 p-6">
            <h2 className="font-roman text-[0.62rem] uppercase tracking-[0.2em] text-gold-300">
              Move this order on
            </h2>
            <div className="mt-5">
              <StatusControl orderId={order.id} current={order.status} />
            </div>
          </section>

          {/* ---- Items -------------------------------------------------- */}
          {order.items.map((item) => {
            const design = item.customDesign;
            const selections = (design?.selections ?? {}) as Record<string, string>;
            const texts = (design?.texts ?? {}) as Record<string, string>;
            const measurements = (design?.measurements ?? {}) as Record<string, number>;

            const measured = MEASUREMENTS.filter(
              (m) => typeof measurements[m.id] === "number" && measurements[m.id] > 0,
            );

            return (
              <section key={item.id} className="rounded-sm border border-hairline p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl text-ink-50">
                    {item.titleSnapshot}
                  </h2>
                  <p className="text-[0.8rem] tabular-nums text-ink-300">
                    {item.quantity} × {formatPrice(item.unitCents)} ={" "}
                    <span className="text-ink-100">{formatPrice(item.totalCents)}</span>
                  </p>
                </div>

                {design && (
                  <p className="mt-1.5 font-roman text-[0.6rem] tracking-[0.18em] text-ink-500">
                    {design.publicCode}
                  </p>
                )}

                {/* Specification — this is what the cutting table works from. */}
                <dl className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  {Object.entries(selections).map(([groupId, optionId]) => (
                    <div
                      key={groupId}
                      className="flex justify-between gap-4 border-b border-hairline/50 py-1.5 text-[0.78rem]"
                    >
                      <dt className="text-ink-500">{groupLabel(groupId)}</dt>
                      <dd className="text-right text-ink-200">
                        {labelFor(groupId, optionId)}
                      </dd>
                    </div>
                  ))}
                </dl>

                {Object.entries(texts).filter(([, v]) => v?.trim()).length > 0 && (
                  <>
                    <h3 className="mt-7 font-roman text-[0.6rem] uppercase tracking-[0.18em] text-gold-300">
                      Personalisation
                    </h3>
                    <dl className="mt-3 space-y-1.5">
                      {Object.entries(texts)
                        .filter(([, v]) => v?.trim())
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between gap-4 text-[0.78rem]">
                            <dt className="text-ink-500">{groupLabel(key)}</dt>
                            <dd className="font-medium uppercase tracking-wider text-gold-200">
                              {value}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  </>
                )}

                {measured.length > 0 && (
                  <>
                    <h3 className="mt-7 font-roman text-[0.6rem] uppercase tracking-[0.18em] text-gold-300">
                      Measurements (cm)
                    </h3>
                    <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1.5 sm:grid-cols-4">
                      {measured.map((m) => (
                        <div key={m.id}>
                          <dt className="text-[0.68rem] text-ink-500">{m.label}</dt>
                          <dd className="font-display text-xl tabular-nums text-ink-100">
                            {measurements[m.id]}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )}

                {design?.specialInstructions && (
                  <>
                    <h3 className="mt-7 font-roman text-[0.6rem] uppercase tracking-[0.18em] text-gold-300">
                      Customer instructions
                    </h3>
                    <p className="mt-2.5 whitespace-pre-wrap rounded-xs border border-hairline bg-ink-850 p-4 text-[0.82rem] leading-relaxed text-ink-200">
                      {design.specialInstructions}
                    </p>
                  </>
                )}

                {design?.referenceImageUrl && (
                  <p className="mt-5 text-[0.78rem]">
                    <a
                      href={design.referenceImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold-200 underline underline-offset-4"
                    >
                      Customer reference image ↗
                    </a>
                  </p>
                )}
              </section>
            );
          })}

          {/* ---- Audit -------------------------------------------------- */}
          {auditTrail.length > 0 && (
            <section>
              <h2 className="font-roman text-[0.62rem] uppercase tracking-[0.2em] text-gold-300">
                History
              </h2>
              <ol className="mt-5 space-y-2.5">
                {auditTrail.map((entry) => {
                  const meta = entry.metadata as { from?: string; to?: string } | null;
                  return (
                    <li key={entry.id} className="flex gap-4 text-[0.76rem]">
                      <span className="shrink-0 tabular-nums text-ink-600">
                        {formatDateTime(entry.createdAt)}
                      </span>
                      <span className="text-ink-300">
                        {meta?.from && meta?.to
                          ? `${meta.from} → ${meta.to}`
                          : entry.action}
                        <span className="text-ink-600"> · {entry.actorEmail}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>

        {/* ---- Sidebar ---------------------------------------------------- */}
        <aside className="space-y-8">
          <section className="rounded-sm border border-hairline bg-ink-900 p-6">
            <h2 className="font-roman text-[0.62rem] uppercase tracking-[0.2em] text-gold-300">
              Totals
            </h2>
            <dl className="mt-5 space-y-2 text-[0.8rem]">
              <Line label="Subtotal" value={formatPrice(order.subtotalCents)} />
              {order.bulkDiscountCents > 0 && (
                <Line
                  label="Bulk discount"
                  value={`− ${formatPrice(order.bulkDiscountCents)}`}
                  accent
                />
              )}
              {order.couponDiscountCents > 0 && (
                <Line
                  label={`Coupon ${order.couponCode ?? ""}`}
                  value={`− ${formatPrice(order.couponDiscountCents)}`}
                  accent
                />
              )}
              <Line label="Shipping" value={formatPrice(order.shippingCents)} />
              {order.taxCents > 0 && (
                <Line label="Tax" value={formatPrice(order.taxCents)} />
              )}
            </dl>
            <div className="mt-5 flex items-end justify-between border-t border-hairline pt-4">
              <span className="text-[0.72rem] text-ink-500">Total</span>
              <span className="font-display text-3xl tabular-nums text-gilt">
                {formatPrice(order.totalCents, order.currency)}
              </span>
            </div>
          </section>

          <section className="rounded-sm border border-hairline p-6">
            <h2 className="font-roman text-[0.62rem] uppercase tracking-[0.2em] text-gold-300">
              Customer
            </h2>
            <div className="mt-5 space-y-1.5 text-[0.82rem]">
              <p className="text-ink-100">{order.customer.name ?? "—"}</p>
              <p>
                <a
                  href={`mailto:${order.customer.email}`}
                  className="text-gold-200 hover:underline"
                >
                  {order.customer.email}
                </a>
              </p>
              {order.customer.phone && (
                <p className="text-ink-300">{order.customer.phone}</p>
              )}
              {order.customer.company && (
                <p className="text-ink-400">{order.customer.company}</p>
              )}
              {order.customer.isWholesale && (
                <p className="pt-1 font-roman text-[0.58rem] uppercase tracking-[0.16em] text-gold-300">
                  Wholesale account
                </p>
              )}
            </div>
          </section>

          <section className="rounded-sm border border-hairline p-6">
            <h2 className="font-roman text-[0.62rem] uppercase tracking-[0.2em] text-gold-300">
              Deliver to
            </h2>
            <address className="mt-5 space-y-0.5 text-[0.82rem] not-italic leading-relaxed text-ink-300">
              <p className="text-ink-100">{order.shippingName}</p>
              <p>{order.shippingLine1}</p>
              {order.shippingLine2 && <p>{order.shippingLine2}</p>}
              <p>
                {order.shippingCity}
                {order.shippingRegion ? `, ${order.shippingRegion}` : ""}
              </p>
              <p>{order.shippingPostal}</p>
              <p>{order.shippingCountry}</p>
            </address>

            <dl className="mt-6 space-y-2 border-t border-hairline pt-5 text-[0.78rem]">
              <Line label="Lead time" value={`${order.leadTimeDays} working days`} />
              <Line label="Est. dispatch" value={formatDate(order.estimatedShipAt)} />
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}

function Line({
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
      <dt className={accent ? "text-gold-400" : "text-ink-500"}>{label}</dt>
      <dd className={accent ? "tabular-nums text-gold-300" : "tabular-nums text-ink-200"}>
        {value}
      </dd>
    </div>
  );
}
