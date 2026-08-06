import { z } from "zod";
import { OPTION_GROUPS, MEASUREMENTS } from "@/config/configurator";

/**
 * Request validation for the public order endpoint.
 *
 * Everything crossing the network boundary is parsed here before it reaches
 * business logic or the database. Option ids are validated against an enum
 * built from the config itself, so an attacker cannot invent a free "leather"
 * or smuggle a script tag through a select field.
 */

const optionIdsFor = (groupId: string) => {
  const group = OPTION_GROUPS.find((g) => g.id === groupId);
  return group?.options?.map((o) => o.id) ?? [];
};

/** Selections: every key must be a known group, every value a known option. */
const selectionsSchema = z
  .object(
    Object.fromEntries(
      OPTION_GROUPS.filter((g) => g.type === "single").map((g) => {
        const ids = optionIdsFor(g.id);
        const schema =
          ids.length > 0
            ? z.enum(ids as [string, ...string[]])
            : z.string().max(64);
        return [g.id, g.required ? schema : schema.optional()];
      }),
    ),
  )
  .strict();

const textsSchema = z
  .object(
    Object.fromEntries(
      OPTION_GROUPS.filter((g) => g.type === "text").map((g) => [
        g.id,
        z
          .string()
          .max(g.maxLength ?? 64)
          // Stitched lettering is physically limited to these glyphs. This
          // doubles as injection defence on a field that ends up in a PDF,
          // an email and an admin table.
          .regex(/^[\p{L}\p{N} .,'&-]*$/u, "Contains unsupported characters")
          .optional(),
      ]),
    ),
  )
  .strict()
  .optional();

const measurementsSchema = z
  .object(
    Object.fromEntries(
      MEASUREMENTS.map((m) => [
        m.id,
        z.number().min(m.min).max(m.max).optional(),
      ]),
    ),
  )
  .strict()
  .optional();

/**
 * Customer and shipping shapes are exported separately so the checkout form
 * validates against the exact same rules the API enforces. Two definitions
 * would drift, and the drift always surfaces as a 422 the user cannot action.
 */
export const customerSchema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  email: z.string().trim().email("Enter a valid email").max(200).toLowerCase(),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(160).optional(),
});

export const shippingSchema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  line1: z.string().trim().min(1, "Required").max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1, "Required").max(120),
  region: z.string().trim().max(120).optional(),
  postal: z.string().trim().min(1, "Required").max(32),
  country: z.string().trim().min(2, "Required").max(80),
});

/** What the checkout form itself collects. */
export const checkoutFormSchema = z.object({
  customer: customerSchema,
  shipping: shippingSchema,
  destination: z.enum(["domestic", "international"]),
  specialInstructions: z.string().max(1000).optional(),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export const orderRequestSchema = z.object({
  selections: selectionsSchema,
  texts: textsSchema,
  measurements: measurementsSchema,
  quantity: z.number().int().min(1).max(100_000),
  couponCode: z.string().trim().max(32).optional(),
  destination: z.enum(["domestic", "international"]).default("domestic"),
  specialInstructions: z.string().max(1000).optional(),
  referenceImageUrl: z.string().url().max(500).optional(),

  customer: customerSchema,
  shipping: shippingSchema,

  /**
   * What the browser believes the total is. NOT trusted — the server recomputes
   * and rejects on mismatch. Its only purpose is to detect a stale price
   * (config changed mid-session) and show the customer an honest error rather
   * than silently charging a different number than the one they agreed to.
   */
  expectedTotalCents: z.number().int().min(0),

  /**
   * Honeypot. Real users never fill a hidden field.
   *
   * Deliberately permissive — it must PASS validation so the route handler can
   * return a convincing fake success. A `.max(0)` here would reject the request
   * with a 422 naming this exact field, which teaches a bot precisely which
   * input to leave alone and makes the trap worse than useless.
   */
  website: z.string().max(200).optional(),
});

export type OrderRequest = z.infer<typeof orderRequestSchema>;

export const enquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200).toLowerCase(),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(160).optional(),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10).max(4000),
  quantity: z.number().int().min(1).max(1_000_000).optional(),
  type: z.enum(["GENERAL", "WHOLESALE", "CUSTOM", "SUPPORT"]).default("GENERAL"),
  /** Honeypot — must pass validation. See the note on orderRequestSchema.website. */
  website: z.string().max(200).optional(),
});
