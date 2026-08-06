import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { orderRequestSchema, checkoutFormSchema, enquirySchema } from "./order";

const validSelections = {
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

const validOrder = {
  selections: validSelections,
  quantity: 1,
  destination: "domestic" as const,
  customer: { name: "A Buyer", email: "buyer@example.com" },
  shipping: {
    name: "A Buyer",
    line1: "1 Test Street",
    city: "Lahore",
    postal: "54000",
    country: "Pakistan",
  },
  expectedTotalCents: 36_400,
};

describe("order request validation", () => {
  test("accepts a well-formed order", () => {
    assert.equal(orderRequestSchema.safeParse(validOrder).success, true);
  });

  test("rejects a forged option id rather than pricing it as free", () => {
    const result = orderRequestSchema.safeParse({
      ...validOrder,
      selections: { ...validSelections, leather: "free-unicorn-hide" },
    });
    assert.equal(result.success, false);
  });

  test("rejects unknown keys smuggled into selections", () => {
    const result = orderRequestSchema.safeParse({
      ...validOrder,
      selections: { ...validSelections, secretDiscount: "yes" },
    });
    assert.equal(result.success, false, "selections must be strict");
  });

  test("normalises email to lowercase and trims", () => {
    const result = orderRequestSchema.safeParse({
      ...validOrder,
      customer: { name: "A", email: "  MiXeD@Example.COM  " },
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.customer.email, "mixed@example.com");
    }
  });

  test("rejects markup in stitched lettering", () => {
    const result = orderRequestSchema.safeParse({
      ...validOrder,
      texts: { customText: "<script>x</script>" },
    });
    assert.equal(result.success, false);
  });

  test("allows ordinary punctuation and accents in lettering", () => {
    const result = orderRequestSchema.safeParse({
      ...validOrder,
      texts: { customText: "O'Brien & Sons, Éire" },
    });
    assert.equal(result.success, true);
  });

  test("rejects out-of-range measurements", () => {
    const tooSmall = orderRequestSchema.safeParse({
      ...validOrder,
      measurements: { chest: 5 },
    });
    assert.equal(tooSmall.success, false);
  });

  test("rejects non-integer or non-positive quantity", () => {
    for (const quantity of [0, -3, 1.5, 200_000]) {
      const result = orderRequestSchema.safeParse({ ...validOrder, quantity });
      assert.equal(result.success, false, `quantity ${quantity} should be rejected`);
    }
  });

  /**
   * Regression guard. The honeypot was originally `z.string().max(0)`, which
   * made a filled field fail validation with a 422 naming the field — telling
   * a bot exactly which input to skip, and leaving the route's fake-success
   * branch unreachable. It must PASS schema validation so the handler can
   * respond indistinguishably from a real order.
   */
  test("honeypot passes validation so the handler can fake success", () => {
    const result = orderRequestSchema.safeParse({
      ...validOrder,
      website: "http://spam.example",
    });
    assert.equal(
      result.success,
      true,
      "honeypot must not be rejected by the schema",
    );
    if (result.success) assert.equal(result.data.website, "http://spam.example");
  });
});

describe("enquiry validation", () => {
  const validEnquiry = {
    name: "A Retailer",
    email: "buyer@shop.example",
    message: "We would like to discuss a 500-unit run for next season.",
  };

  test("accepts a well-formed enquiry and defaults the type", () => {
    const result = enquirySchema.safeParse(validEnquiry);
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.type, "GENERAL");
  });

  test("rejects a message too short to be actionable", () => {
    const result = enquirySchema.safeParse({ ...validEnquiry, message: "hi" });
    assert.equal(result.success, false);
  });

  /** Same regression guard as the order honeypot — see the note there. */
  test("honeypot passes validation so the handler can fake success", () => {
    const result = enquirySchema.safeParse({
      ...validEnquiry,
      website: "http://spam.example",
    });
    assert.equal(result.success, true);
  });
});

describe("checkout form validation", () => {
  test("mirrors the API contract for customer and shipping", () => {
    const result = checkoutFormSchema.safeParse({
      customer: validOrder.customer,
      shipping: validOrder.shipping,
      destination: "international",
    });
    assert.equal(result.success, true);
  });

  test("surfaces a usable message on a bad email", () => {
    const result = checkoutFormSchema.safeParse({
      customer: { name: "A", email: "nope" },
      shipping: validOrder.shipping,
      destination: "domestic",
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.match(result.error.issues[0].message, /valid email/i);
    }
  });
});
