import { z } from "zod";

/**
 * Product and collection validation, shared by the admin form and the server
 * actions that persist them. One definition — two would drift, and the drift
 * shows up as a form that says "saved" while the server rejects it.
 */

const slug = z
  .string()
  .trim()
  .min(1, "Required")
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Lowercase letters, numbers and single hyphens only",
  );

/** Money arrives from a form as a decimal string; store integer cents. */
const priceToCents = z
  .union([z.string(), z.number()])
  .transform((v) => {
    const n = typeof v === "number" ? v : Number(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? Math.round(n * 100) : NaN;
  })
  .refine((n) => Number.isInteger(n) && n >= 0, "Enter a valid price")
  .refine((n) => n <= 100_000_00, "That price looks wrong — check it");

export const productSchema = z.object({
  id: z.string().max(64).optional(),
  slug,
  sku: z.string().trim().min(1, "Required").max(64),
  title: z.string().trim().min(1, "Required").max(160),
  subtitle: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().min(1, "Required").max(4000),
  story: z.string().trim().max(4000).optional().or(z.literal("")),

  basePriceCents: priceToCents,
  currency: z.string().trim().length(3).default("USD"),

  category: z.enum([
    "LEATHER_JACKET",
    "LEATHER_GOODS",
    "SUBLIMATED_JERSEY",
    "ACCESSORY",
    "OTHER",
  ]),
  gender: z.enum(["MENS", "WOMENS", "UNISEX"]).default("UNISEX"),

  /** Drives the 3D render when there is no photograph. */
  leatherSwatch: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #45271A"),
  leatherGrain: z.coerce.number().int().min(4).max(80).default(26),

  features: z.array(z.string().trim().max(200)).max(20).default([]),
  specs: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        value: z.string().trim().min(1).max(200),
      }),
    )
    .max(30)
    .default([]),

  collectionId: z.string().max(64).optional().or(z.literal("")),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  position: z.coerce.number().int().min(0).max(9999).default(0),

  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoDesc: z.string().trim().max(170).optional().or(z.literal("")),
});

export type ProductInput = z.infer<typeof productSchema>;

export const collectionSchema = z.object({
  id: z.string().max(64).optional(),
  slug,
  title: z.string().trim().min(1, "Required").max(160),
  subtitle: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  position: z.coerce.number().int().min(0).max(9999).default(0),
  published: z.boolean().default(false),
  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoDesc: z.string().trim().max(170).optional().or(z.literal("")),
});

export type CollectionInput = z.infer<typeof collectionSchema>;
