import {
  OPTION_GROUPS,
  STYLES,
  BULK_TIERS,
  BASE_LEAD_TIME_DAYS,
  SHIPPING,
  type Option,
  type OptionGroup,
} from "@/config/configurator";

/**
 * The pricing engine.
 *
 * Design rules, all of them load-bearing:
 *
 *  1. Integer cents only. Never a float. `0.1 + 0.2` problems in a quote are
 *     how you end up invoicing $1,234.5600000001.
 *  2. Pure and synchronous. Same input → same output, always. No dates, no
 *     randomness, no I/O. That is what makes it safe to run identically in the
 *     browser (instant feedback) and on the server (authoritative).
 *  3. Every number that reaches the customer is accompanied by a line item
 *     explaining it. A configurator that shows a total with no breakdown reads
 *     as arbitrary, and arbitrary prices lose bulk enquiries.
 *
 * The client copy is a convenience. `POST /api/orders` recomputes from scratch
 * and rejects any mismatch — a hostile client can send whatever it likes.
 */

export type Selections = Record<string, string | string[] | undefined>;

export type Measurements = Partial<Record<string, number>>;

export type PriceInput = {
  selections: Selections;
  quantity: number;
  /**
   * Free-text personalisation keyed by group id. Values are optional because
   * Zod's `.optional()` fields arrive as `string | undefined` — accepting that
   * here avoids a lossy cast at every call site.
   */
  texts?: Record<string, string | undefined>;
  couponCode?: string;
  destination?: "domestic" | "international";
  /** Tax rate in basis points. 0 unless the admin configures a jurisdiction. */
  taxRateBps?: number;
};

export type LineItem = {
  id: string;
  label: string;
  detail?: string;
  cents: number;
};

export type Coupon = {
  code: string;
  /** Exactly one of these is set. */
  percentOffBps?: number;
  amountOffCents?: number;
  minSubtotalCents?: number;
};

export type PriceBreakdown = {
  lineItems: LineItem[];
  unitCents: number;
  quantity: number;
  subtotalCents: number;
  bulkTier: (typeof BULK_TIERS)[number];
  bulkDiscountCents: number;
  couponCode?: string;
  couponDiscountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  leadTimeDays: number;
  /** Non-fatal notes — unrecognised coupon, ignored options, etc. */
  warnings: string[];
};

const groupById = new Map<string, OptionGroup>(
  OPTION_GROUPS.map((g) => [g.id, g]),
);

function findOption(group: OptionGroup, id: string | undefined): Option | undefined {
  if (!id || !group.options) return undefined;
  return group.options.find((o) => o.id === id);
}

/** Basis points of a value, rounded half-up to the nearest cent. */
function applyBps(cents: number, bps: number): number {
  return Math.round((cents * bps) / 10_000);
}

export function resolveBulkTier(quantity: number) {
  // Tiers are ordered ascending; walk up and keep the last one that qualifies.
  // Annotated explicitly: without it TS infers the narrow literal type of
  // element 0 and rejects every other tier.
  let tier: (typeof BULK_TIERS)[number] = BULK_TIERS[0];
  for (const t of BULK_TIERS) {
    if (quantity >= t.minQty) tier = t;
  }
  return tier;
}

export function calculatePrice(
  input: PriceInput,
  coupons: Coupon[] = [],
): PriceBreakdown {
  const warnings: string[] = [];
  const lineItems: LineItem[] = [];

  const quantity = Math.max(1, Math.floor(input.quantity || 1));

  // ---- 1. Base -----------------------------------------------------------
  const styleId = input.selections.style;
  const style = STYLES.find((s) => s.id === styleId);

  if (!style) {
    // Cheapest style as a floor, so the UI always has a number to show while
    // the user is still on step one.
    warnings.push("No style selected; showing the entry-level base price.");
  }

  const resolvedStyle = style ?? STYLES.reduce((a, b) =>
    (a.price as { cents: number }).cents <= (b.price as { cents: number }).cents ? a : b,
  );

  const baseCents =
    resolvedStyle.price.kind === "add" ? resolvedStyle.price.cents : 0;

  lineItems.push({
    id: "base",
    label: resolvedStyle.label,
    detail: "Base construction",
    cents: baseCents,
  });

  let leadTimeDays = BASE_LEAD_TIME_DAYS + (resolvedStyle.leadTimeDays ?? 0);

  // ---- 2. Leather multiplier (applies to base only) ----------------------
  const leatherGroup = groupById.get("leather")!;
  const leather = findOption(leatherGroup, input.selections.leather as string);

  let leatherAdjustment = 0;
  if (leather && leather.price.kind === "multiplyBase") {
    // Multiply the *base* rather than the running total: hide cost scales with
    // pattern area, not with how many zips someone added.
    leatherAdjustment = Math.round(baseCents * leather.price.factor) - baseCents;
    if (leatherAdjustment !== 0) {
      lineItems.push({
        id: "leather",
        label: leather.label,
        detail: `${leather.price.factor > 1 ? "+" : ""}${Math.round(
          (leather.price.factor - 1) * 100,
        )}% on base`,
        cents: leatherAdjustment,
      });
    }
    leadTimeDays += leather.leadTimeDays ?? 0;
  }

  // ---- 3. Flat adders across every remaining group ------------------------
  let addersCents = 0;

  for (const group of OPTION_GROUPS) {
    if (group.id === "style" || group.id === "leather") continue;

    if (group.type === "single") {
      const selected = findOption(group, input.selections[group.id] as string);
      if (!selected) {
        if (group.required) {
          warnings.push(`${group.label} not yet selected.`);
        }
        continue;
      }
      if (selected.soldOut) {
        warnings.push(`${selected.label} is currently unavailable.`);
      }

      leadTimeDays += selected.leadTimeDays ?? 0;

      if (selected.price.kind === "add" && selected.price.cents !== 0) {
        addersCents += selected.price.cents;
        lineItems.push({
          id: group.id,
          label: selected.label,
          detail: group.label,
          cents: selected.price.cents,
        });
      }
    }

    if (group.type === "text" && group.pricePerCharacter) {
      const raw = input.texts?.[group.id] ?? "";
      // Whitespace is not stitched, so it is not charged.
      const chars = raw.trim().replace(/\s+/g, "").length;
      if (chars > 0) {
        const capped = Math.min(chars, group.maxLength ?? chars);
        if (chars > capped) {
          warnings.push(
            `${group.label} truncated to ${capped} characters.`,
          );
        }
        const cents = capped * group.pricePerCharacter;
        addersCents += cents;
        leadTimeDays += 2;
        lineItems.push({
          id: group.id,
          label: group.label,
          detail: `${capped} character${capped === 1 ? "" : "s"}`,
          cents,
        });
      }
    }
  }

  // ---- 4. Unit and subtotal ----------------------------------------------
  const unitCents = baseCents + leatherAdjustment + addersCents;
  const subtotalCents = unitCents * quantity;

  // ---- 5. Bulk tier -------------------------------------------------------
  const bulkTier = resolveBulkTier(quantity);
  const bulkDiscountCents = applyBps(subtotalCents, bulkTier.discountBps);

  // ---- 6. Coupon ----------------------------------------------------------
  // Applied after bulk, on the already-discounted amount, so the two never
  // compound into a negative total.
  const afterBulk = subtotalCents - bulkDiscountCents;
  let couponDiscountCents = 0;
  let couponCode: string | undefined;

  if (input.couponCode) {
    const normalised = input.couponCode.trim().toUpperCase();
    const coupon = coupons.find((c) => c.code.toUpperCase() === normalised);

    if (!coupon) {
      warnings.push(`Coupon "${input.couponCode}" is not valid.`);
    } else if (
      coupon.minSubtotalCents !== undefined &&
      afterBulk < coupon.minSubtotalCents
    ) {
      warnings.push(
        `Coupon "${coupon.code}" requires a minimum order of ${(
          coupon.minSubtotalCents / 100
        ).toFixed(2)}.`,
      );
    } else {
      couponCode = coupon.code;
      couponDiscountCents = coupon.percentOffBps
        ? applyBps(afterBulk, coupon.percentOffBps)
        : Math.min(coupon.amountOffCents ?? 0, afterBulk);
    }
  }

  const discountedCents = Math.max(0, afterBulk - couponDiscountCents);

  // ---- 7. Shipping --------------------------------------------------------
  const destination = input.destination ?? "domestic";
  const shippingCents =
    discountedCents >= SHIPPING.freeAboveCents ? 0 : SHIPPING[destination].cents;

  // ---- 8. Tax -------------------------------------------------------------
  // Charged on goods, not on shipping — the common default. Jurisdictions that
  // tax freight need this overridden in admin settings.
  const taxRateBps = input.taxRateBps ?? 0;
  const taxCents = applyBps(discountedCents, taxRateBps);

  const totalCents = discountedCents + shippingCents + taxCents;

  return {
    lineItems,
    unitCents,
    quantity,
    subtotalCents,
    bulkTier,
    bulkDiscountCents,
    couponCode,
    couponDiscountCents,
    shippingCents,
    taxCents,
    totalCents,
    leadTimeDays,
    warnings,
  };
}

/** Groups still missing a required selection. Drives the "can submit" gate. */
export function missingRequired(selections: Selections): OptionGroup[] {
  return OPTION_GROUPS.filter(
    (g) => g.required && g.type === "single" && !selections[g.id],
  );
}
