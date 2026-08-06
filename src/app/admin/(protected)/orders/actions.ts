"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { canTransition, STATUS_LABEL } from "@/lib/orders/status";

/**
 * Order mutations.
 *
 * SECURITY: every action re-checks the session itself.
 *
 * A "use server" function compiles to a publicly routable POST endpoint. The
 * protected layout gates the *page*, not these — anyone who knows the action
 * id can invoke one directly without ever rendering the admin UI. Relying on
 * the layout here would be a straightforward authorisation bypass.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

const statusInput = z.object({
  orderId: z.string().min(1).max(64),
  status: z.nativeEnum(OrderStatus),
});

export async function updateOrderStatus(
  input: z.infer<typeof statusInput>,
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not signed in." };

  const parsed = statusInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { orderId, status } = parsed.data;

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, orderNumber: true },
  });
  if (!order) return { ok: false, error: "Order not found." };

  if (order.status === status) return { ok: true };

  // Enforced server-side, not just by hiding buttons in the UI.
  if (!canTransition(order.status, status)) {
    return {
      ok: false,
      error: `Cannot move an order from ${STATUS_LABEL[order.status]} to ${STATUS_LABEL[status]}.`,
    };
  }

  await db.$transaction([
    db.order.update({ where: { id: orderId }, data: { status } }),
    db.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        action: "order.status",
        entity: "Order",
        entityId: orderId,
        metadata: {
          orderNumber: order.orderNumber,
          from: order.status,
          to: status,
        },
      },
    }),
  ]);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
  return { ok: true };
}

const notesInput = z.object({
  orderId: z.string().min(1).max(64),
  notes: z.string().max(4000),
});

export async function updateOrderNotes(
  input: z.infer<typeof notesInput>,
): Promise<ActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not signed in." };

  const parsed = notesInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Notes are too long." };

  await db.order.update({
    where: { id: parsed.data.orderId },
    data: { notes: parsed.data.notes },
  });

  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { ok: true };
}
