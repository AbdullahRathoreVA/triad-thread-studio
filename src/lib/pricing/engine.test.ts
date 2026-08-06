import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calculatePrice, resolveBulkTier, missingRequired } from "./engine";
import { SHIPPING, BASE_LEAD_TIME_DAYS } from "@/config/configurator";

/** A fully-specified jacket, so tests can vary one axis at a time. */
const complete = {
  gender: "mens",
  style: "biker",
  length: "regular",
  fit: "slim",
  leather: "cowhide-full",
  colour: "jet",
  finish: "matte",
  collar: "notch",
  sleeves: "set-in",
  pockets: "welt",
  lining: "polyester",
  thread: "tonal",
  hardware: "gunmetal",
  size: "m",
};

describe("base pricing", () => {
  test("an all-default biker prices at exactly its base", () => {
    const r = calculatePrice({ selections: complete, quantity: 1 });
    // Biker base 34900; cowhide is ×1.0; every other default is free.
    assert.equal(r.unitCents, 34_900);
    assert.equal(r.subtotalCents, 34_900);
    assert.deepEqual(r.warnings, []);
  });

  test("missing style warns and falls back to the cheapest base", () => {
    const r = calculatePrice({ selections: {}, quantity: 1 });
    assert.equal(r.unitCents > 0, true);
    assert.ok(r.warnings.some((w) => w.includes("No style selected")));
  });

  test("leather multiplier applies to base only, not to add-ons", () => {
    const withAddons = calculatePrice({
      selections: { ...complete, leather: "lambskin", hardware: "ykk-excella" },
      quantity: 1,
    });
    // 34900 × 1.22 = 42578, + 9000 hardware = 51578.
    // If the multiplier wrongly applied after the add-on it would be 53558.
    assert.equal(withAddons.unitCents, 51_578);
  });
});

describe("personalisation", () => {
  test("custom text is charged per non-whitespace character", () => {
    const r = calculatePrice({
      selections: complete,
      quantity: 1,
      texts: { customText: "RIDE FREE" },
    });
    // "RIDEFREE" = 8 chars × 180 = 1440.
    const line = r.lineItems.find((l) => l.id === "customText");
    assert.equal(line?.cents, 1_440);
    assert.equal(r.unitCents, 34_900 + 1_440);
  });

  test("empty and whitespace-only text is free", () => {
    const r = calculatePrice({
      selections: complete,
      quantity: 1,
      texts: { customText: "   " },
    });
    assert.equal(r.unitCents, 34_900);
    assert.equal(r.lineItems.some((l) => l.id === "customText"), false);
  });
});

describe("bulk tiers", () => {
  test("tier boundaries resolve to the correct band", () => {
    assert.equal(resolveBulkTier(1).discountBps, 0);
    assert.equal(resolveBulkTier(11).discountBps, 0);
    assert.equal(resolveBulkTier(12).discountBps, 800);
    assert.equal(resolveBulkTier(49).discountBps, 800);
    assert.equal(resolveBulkTier(50).discountBps, 1400);
    assert.equal(resolveBulkTier(1000).discountBps, 3200);
    assert.equal(resolveBulkTier(99_999).discountBps, 3200);
  });

  test("a 50-unit order discounts 14% of subtotal", () => {
    const r = calculatePrice({ selections: complete, quantity: 50 });
    assert.equal(r.subtotalCents, 34_900 * 50);
    assert.equal(r.bulkDiscountCents, Math.round(34_900 * 50 * 0.14));
  });
});

describe("coupons", () => {
  const coupons = [
    { code: "STUDIO10", percentOffBps: 1000 },
    { code: "FLAT50", amountOffCents: 5_000, minSubtotalCents: 40_000 },
  ];

  test("percentage coupon applies after the bulk discount, not before", () => {
    const r = calculatePrice(
      { selections: complete, quantity: 12, couponCode: "STUDIO10" },
      coupons,
    );
    const subtotal = 34_900 * 12;
    const bulk = Math.round(subtotal * 0.08);
    assert.equal(r.bulkDiscountCents, bulk);
    assert.equal(r.couponDiscountCents, Math.round((subtotal - bulk) * 0.1));
  });

  test("an unknown coupon warns and costs nothing", () => {
    const r = calculatePrice(
      { selections: complete, quantity: 1, couponCode: "NOPE" },
      coupons,
    );
    assert.equal(r.couponDiscountCents, 0);
    assert.equal(r.couponCode, undefined);
    assert.ok(r.warnings.some((w) => w.includes("not valid")));
  });

  test("a coupon below its minimum is rejected with a reason", () => {
    const r = calculatePrice(
      { selections: { ...complete, style: "racer" }, quantity: 1, couponCode: "FLAT50" },
      // racer base 29900 < 40000 minimum
      coupons,
    );
    assert.equal(r.couponDiscountCents, 0);
    assert.ok(r.warnings.some((w) => w.includes("minimum order")));
  });

  test("a fixed coupon can never drive the total negative", () => {
    const r = calculatePrice(
      { selections: complete, quantity: 1, couponCode: "HUGE" },
      [{ code: "HUGE", amountOffCents: 999_999_99 }],
    );
    assert.ok(r.totalCents >= 0);
    assert.equal(r.couponDiscountCents, 34_900);
  });
});

describe("shipping and tax", () => {
  test("shipping is waived above the free threshold", () => {
    const r = calculatePrice({ selections: complete, quantity: 1 });
    // 34900 < 75000, so shipping is charged.
    assert.ok(r.subtotalCents < SHIPPING.freeAboveCents);
    assert.equal(r.shippingCents, SHIPPING.domestic.cents);

    const big = calculatePrice({ selections: complete, quantity: 3 });
    assert.equal(big.shippingCents, 0);
  });

  test("international shipping costs more", () => {
    const r = calculatePrice({
      selections: complete,
      quantity: 1,
      destination: "international",
    });
    assert.equal(r.shippingCents, SHIPPING.international.cents);
  });

  test("tax is charged on goods, not on shipping", () => {
    const r = calculatePrice({
      selections: complete,
      quantity: 1,
      taxRateBps: 2000, // 20%
    });
    assert.equal(r.taxCents, Math.round(34_900 * 0.2));
    assert.equal(r.totalCents, 34_900 + r.shippingCents + r.taxCents);
  });
});

describe("lead time", () => {
  test("options accumulate onto the base lead time", () => {
    const r = calculatePrice({
      selections: {
        ...complete,
        style: "moto-protective", // +7
        colour: "custom-dye", // +10
        lining: "shearling-full", // +7
        size: "made-to-measure", // +7
      },
      quantity: 1,
    });
    assert.equal(r.leadTimeDays, BASE_LEAD_TIME_DAYS + 7 + 10 + 7 + 7);
  });
});

describe("integrity", () => {
  test("every money field is a whole number of cents", () => {
    const r = calculatePrice(
      {
        selections: { ...complete, leather: "goatskin", finish: "waxed" },
        quantity: 37,
        texts: { customText: "TRIAD", initials: "AB" },
        couponCode: "STUDIO10",
        taxRateBps: 1750,
      },
      [{ code: "STUDIO10", percentOffBps: 1000 }],
    );

    const money = [
      r.unitCents, r.subtotalCents, r.bulkDiscountCents,
      r.couponDiscountCents, r.shippingCents, r.taxCents, r.totalCents,
      ...r.lineItems.map((l) => l.cents),
    ];
    for (const v of money) {
      assert.equal(Number.isInteger(v), true, `${v} is not an integer`);
    }
  });

  test("the breakdown reconciles to the total", () => {
    const r = calculatePrice({ selections: complete, quantity: 12, taxRateBps: 1000 });
    const summed = r.lineItems.reduce((acc, l) => acc + l.cents, 0);
    assert.equal(summed, r.unitCents);
    assert.equal(
      r.totalCents,
      r.subtotalCents - r.bulkDiscountCents - r.couponDiscountCents
        + r.shippingCents + r.taxCents,
    );
  });

  test("quantity is floored to at least one", () => {
    assert.equal(calculatePrice({ selections: complete, quantity: 0 }).quantity, 1);
    assert.equal(calculatePrice({ selections: complete, quantity: -8 }).quantity, 1);
    assert.equal(calculatePrice({ selections: complete, quantity: 4.7 }).quantity, 4);
  });

  test("missingRequired reports every unset required group", () => {
    assert.equal(missingRequired(complete).length, 0);
    const partial = { style: "biker" };
    assert.ok(missingRequired(partial).length > 5);
  });
});
