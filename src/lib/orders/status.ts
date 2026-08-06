import type { OrderStatus } from "@prisma/client";

/**
 * Allowed order status transitions.
 *
 * A state machine rather than a free dropdown, because the alternative is a
 * mis-click moving a DELIVERED order back to PENDING and corrupting the
 * revenue figures on the dashboard. Terminal states have no exits: a refunded
 * order stays refunded, and correcting a genuine mistake is a deliberate
 * database action, not one click in a list view.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["QUALITY_CHECK", "CANCELLED"],
  QUALITY_CHECK: ["SHIPPED", "IN_PRODUCTION"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  IN_PRODUCTION: "In production",
  QUALITY_CHECK: "Quality check",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

/** Tailwind classes per status. Muted palette — this is a working tool. */
export const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: "border-gold-300/40 text-gold-200",
  CONFIRMED: "border-sky-400/35 text-sky-300",
  IN_PRODUCTION: "border-violet-400/35 text-violet-300",
  QUALITY_CHECK: "border-amber-400/35 text-amber-300",
  SHIPPED: "border-emerald-400/35 text-emerald-300",
  DELIVERED: "border-emerald-500/45 text-emerald-200",
  CANCELLED: "border-ink-500 text-ink-400",
  REFUNDED: "border-red-400/35 text-red-300",
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Statuses that count toward booked revenue. */
export const REVENUE_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "SHIPPED",
  "DELIVERED",
];
