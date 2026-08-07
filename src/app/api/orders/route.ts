import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import { orderRequestSchema } from "@/lib/validation/order";
import { calculatePrice, type Coupon } from "@/lib/pricing/engine";
import { hit, clientIp } from "@/lib/rate-limit";
import { sendOrderConfirmation } from "@/lib/email";

export const runtime = "nodejs";

/** Unambiguous alphabet — no O/0, I/1 — because these get read aloud on calls. */
const publicCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export async function POST(request: Request) {
  // ---- 1. Rate limit ------------------------------------------------------
  const ip = clientIp(request.headers);
  const limit = hit(`orders:${ip}`, 8, 60 * 60 * 1000);

  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many orders from this address. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  // ---- 2. Parse and validate ----------------------------------------------
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const parsed = orderRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Some details need correcting.",
        // Field-level messages only. Never echo the raw input back.
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }

  const input = parsed.data;

  // Honeypot: respond exactly like success so bots learn nothing.
  if (input.website) {
    return NextResponse.json({ ok: true, orderNumber: "TTS-0000-0000" });
  }

  try {
    // ---- 3. Load live coupons ---------------------------------------------
    const now = new Date();
    const dbCoupons = input.couponCode
      ? await db.coupon.findMany({
          where: {
            code: input.couponCode.trim().toUpperCase(),
            active: true,
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }],
          },
        })
      : [];

    const coupons: Coupon[] = dbCoupons
      // Exhausted coupons are dropped here rather than in the engine, which
      // stays pure and knows nothing about redemption counts.
      .filter((c) => c.maxRedemptions === null || c.timesRedeemed < c.maxRedemptions)
      .map((c) => ({
        code: c.code,
        percentOffBps: c.percentOffBps ?? undefined,
        amountOffCents: c.amountOffCents ?? undefined,
        minSubtotalCents: c.minSubtotalCents ?? undefined,
      }));

    // ---- 4. Recompute the price, authoritatively ---------------------------
    // The client's figure is never used. It is only compared, so that a stale
    // quote produces an honest error instead of a surprise charge.
    const price = calculatePrice(
      {
        selections: input.selections,
        quantity: input.quantity,
        texts: input.texts,
        couponCode: input.couponCode,
        destination: input.destination,
      },
      coupons,
    );

    // Only enforced when the browser actually quoted a price. Without public
    // pricing the computed figure is an internal estimate for whoever quotes.
    if (
      input.expectedTotalCents !== undefined &&
      price.totalCents !== input.expectedTotalCents
    ) {
      return NextResponse.json(
        {
          error: "Pricing has changed since you started. Please review the total.",
          code: "PRICE_MISMATCH",
          actualTotalCents: price.totalCents,
        },
        { status: 409 },
      );
    }

    // ---- 5. Persist --------------------------------------------------------
    const order = await db.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { email: input.customer.email },
        update: {
          name: input.customer.name,
          phone: input.customer.phone,
          company: input.customer.company,
        },
        create: {
          email: input.customer.email,
          name: input.customer.name,
          phone: input.customer.phone,
          company: input.customer.company,
          isWholesale: input.quantity >= 12,
        },
      });

      const design = await tx.customDesign.create({
        data: {
          publicCode: `TTS-DSGN-${publicCode()}`,
          selections: input.selections,
          texts: input.texts ?? {},
          measurements: input.measurements ?? {},
          specialInstructions: input.specialInstructions,
          referenceImageUrl: input.referenceImageUrl,
          quantity: input.quantity,
          quotedUnitCents: price.unitCents,
          quotedTotalCents: price.totalCents,
          quotedBreakdown: JSON.parse(JSON.stringify(price)),
          customerId: customer.id,
        },
      });

      // Sequence per calendar year. Counted inside the transaction so two
      // simultaneous orders cannot be handed the same number.
      const year = now.getUTCFullYear();
      const countThisYear = await tx.order.count({
        where: { orderNumber: { startsWith: `TTS-${year}-` } },
      });
      const orderNumber = `TTS-${year}-${String(countThisYear + 1).padStart(4, "0")}`;

      const estimatedShipAt = new Date(now);
      estimatedShipAt.setDate(estimatedShipAt.getDate() + price.leadTimeDays);

      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          subtotalCents: price.subtotalCents,
          bulkDiscountCents: price.bulkDiscountCents,
          couponDiscountCents: price.couponDiscountCents,
          shippingCents: price.shippingCents,
          taxCents: price.taxCents,
          totalCents: price.totalCents,
          couponCode: price.couponCode,
          leadTimeDays: price.leadTimeDays,
          estimatedShipAt,
          shippingName: input.shipping.name,
          shippingLine1: input.shipping.line1,
          shippingLine2: input.shipping.line2,
          shippingCity: input.shipping.city,
          shippingRegion: input.shipping.region,
          shippingPostal: input.shipping.postal,
          shippingCountry: input.shipping.country,
          notes: input.specialInstructions,
          items: {
            create: [
              {
                customDesignId: design.id,
                titleSnapshot: "Custom Jacket",
                specSnapshot: JSON.parse(
                  JSON.stringify({
                    selections: input.selections,
                    texts: input.texts ?? {},
                    measurements: input.measurements ?? {},
                    lineItems: price.lineItems,
                  }),
                ),
                quantity: input.quantity,
                unitCents: price.unitCents,
                totalCents: price.subtotalCents,
              },
            ],
          },
        },
      });

      if (price.couponCode) {
        await tx.coupon.updateMany({
          where: { code: price.couponCode },
          data: { timesRedeemed: { increment: 1 } },
        });
      }

      return { ...created, designCode: design.publicCode, email: customer.email };
    });

    // ---- 6. Confirmation email ---------------------------------------------
    // Deliberately outside the transaction and non-fatal: a mail outage must
    // never roll back a paid-for order. Failures are logged for retry.
    try {
      await sendOrderConfirmation({
        to: order.email,
        orderNumber: order.orderNumber,
        totalCents: order.totalCents,
        leadTimeDays: order.leadTimeDays,
        estimatedShipAt: order.estimatedShipAt,
        designCode: order.designCode,
      });
    } catch (error) {
      console.error("[orders] confirmation email failed", {
        orderNumber: order.orderNumber,
        error,
      });
    }

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      designCode: order.designCode,
      totalCents: order.totalCents,
      leadTimeDays: order.leadTimeDays,
      estimatedShipAt: order.estimatedShipAt,
    });
  } catch (error) {
    // Log the detail, return none — stack traces and DB errors are a
    // reconnaissance gift to an attacker.
    console.error("[orders] failed", error);
    return NextResponse.json(
      { error: "We could not place that order. Please try again." },
      { status: 500 },
    );
  }
}
