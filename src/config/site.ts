/**
 * Single source of truth for business identity.
 *
 * ─── IMPORTANT ────────────────────────────────────────────────────────────
 * Fields marked `PLACEHOLDER` were NOT supplied and have NOT been invented.
 * A manufacturer's contact details, address and lead times are load-bearing
 * trust signals — publishing guessed values is worse than publishing none.
 * Replace every PLACEHOLDER before launch; `npm run check:placeholders`
 * fails the build while any remain.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const PLACEHOLDER = "__PLACEHOLDER__" as const;

export const site = {
  name: "Triad Thread Studio",
  shortName: "Triad Thread",
  /** Tagline lifted verbatim from the supplied logo artwork. */
  tagline: "Leather Products · Sublimated Products",
  description:
    "Manufacturer and supplier of premium leather jackets, custom leather goods and sublimated jerseys. Built to order, made to last.",

  /** Set NEXT_PUBLIC_SITE_URL in production; localhost is a dev fallback only. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_US",

  contact: {
    email: PLACEHOLDER,
    salesEmail: PLACEHOLDER,
    phone: PLACEHOLDER,
    whatsapp: PLACEHOLDER,
    addressLine1: PLACEHOLDER,
    city: PLACEHOLDER,
    region: PLACEHOLDER,
    postalCode: PLACEHOLDER,
    country: PLACEHOLDER,
    mapsUrl: PLACEHOLDER,
  },

  social: {
    instagram: PLACEHOLDER,
    facebook: PLACEHOLDER,
    linkedin: PLACEHOLDER,
    whatsapp: PLACEHOLDER,
  },

  /**
   * Production timings quoted to customers. These drive the order confirmation
   * email and the configurator summary, so they must be real.
   */
  production: {
    standardLeadTimeDays: PLACEHOLDER,
    bulkLeadTimeDays: PLACEHOLDER,
    minimumBulkQuantity: 12,
  },
} as const;

export type NavLink = {
  label: string;
  href: string;
  description?: string;
  children?: NavLink[];
};

export const primaryNav: NavLink[] = [
  {
    label: "Collections",
    href: "/collections",
    description: "Ready-to-ship pieces, cut and finished in-house.",
    children: [
      { label: "Men's Leather Jackets", href: "/collections/mens-leather-jackets" },
      { label: "Women's Leather Jackets", href: "/collections/womens-leather-jackets" },
      { label: "Motorcycle & Protective", href: "/collections/motorcycle" },
      { label: "Leather Goods", href: "/collections/leather-goods" },
      { label: "Sublimated Jerseys", href: "/collections/sublimated-jerseys" },
    ],
  },
  {
    label: "Custom Studio",
    href: "/customize",
    description: "Design your jacket panel by panel. Priced live.",
  },
  {
    label: "Bulk & Wholesale",
    href: "/bulk",
    description: "Teams, retailers and brands. Tiered from 12 units.",
  },
  {
    label: "Craft",
    href: "/craft",
    description: "Hides, hardware and the people who assemble them.",
  },
  { label: "Contact", href: "/contact" },
];

/** Capability strip shown under the hero — derived from the logo's own icon row. */
export const capabilities = [
  { label: "Full-Grain Leather", detail: "Vegetable and chrome tanned hides" },
  { label: "Custom Manufacturing", detail: "Your pattern, spec and hardware" },
  { label: "Sublimation Printing", detail: "Full-colour, edge-to-edge jerseys" },
  { label: "Bulk Supply", detail: "Retailers, teams and clothing labels" },
] as const;
