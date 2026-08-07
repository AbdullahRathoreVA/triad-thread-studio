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

export const PLACEHOLDER = "__PLACEHOLDER__";

/**
 * Whether the public site quotes prices itself.
 *
 * OFF. This is a wholesale manufacturer: the real number depends on run size,
 * hide availability, freight and the relationship, so it is set by an owner
 * per enquiry rather than by a formula. The site captures the specification
 * precisely and asks for a quote.
 *
 * The price engine is NOT deleted — it still runs, but only inside the admin,
 * where it gives whoever is quoting an instant costed starting point they can
 * override. Publishing a number the owners cannot honour is worse than
 * publishing none.
 */
export const SHOW_PUBLIC_PRICING = false;

/**
 * Fields that may still hold PLACEHOLDER are typed as plain `string`, not as
 * literals. With `as const` inference these narrow to the exact value once
 * filled in, and every `=== PLACEHOLDER` guard across the site becomes a
 * compile error for "impossible comparison" — which is precisely backwards,
 * since those guards are what keep unset details off the page.
 */
type Fillable = string;

type SiteContact = {
  email: Fillable;
  salesEmail: Fillable;
  phone: Fillable;
  whatsapp: Fillable;
  addressLine1: Fillable;
  city: Fillable;
  region: Fillable;
  postalCode: Fillable;
  country: Fillable;
  mapsUrl: Fillable;
};

type SiteSocial = {
  instagram: Fillable;
  facebook: Fillable;
  linkedin: Fillable;
  whatsapp: Fillable;
};

type SiteProduction = {
  standardLeadTimeDays: Fillable;
  bulkLeadTimeDays: Fillable;
  minimumBulkQuantity: number;
};

export const site: {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  url: string;
  locale: string;
  contact: SiteContact;
  social: SiteSocial;
  owners: { name: string; role: string }[];
  production: SiteProduction;
} = {
  name: "Triad Thread Studio",
  shortName: "Triad Thread",
  /** Tagline lifted verbatim from the supplied logo artwork. */
  tagline: "Leather Products · Sublimated Products",
  description:
    "Wholesale manufacturer of premium leather jackets, custom leather goods and sublimated jerseys. Quoted per run, manufacturing under your own label.",

  /** Set NEXT_PUBLIC_SITE_URL in production; localhost is a dev fallback only. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_US",

  /** Supplied by the owners 6 Aug 2026. */
  contact: {
    email: "bilalatique050@gmail.com",
    salesEmail: "bilalatique050@gmail.com",
    phone: "+92 312 2031534",
    // WhatsApp deep links need the number with no spaces or plus sign.
    whatsapp: "https://wa.me/923122031534",
    // Still unknown — a trade buyer checks a supplier's address before
    // committing to a run, so this needs a real answer before launch.
    addressLine1: PLACEHOLDER,
    city: PLACEHOLDER,
    region: PLACEHOLDER,
    postalCode: PLACEHOLDER,
    country: "Pakistan",
    mapsUrl: PLACEHOLDER,
  },

  /** Pending — the business pages are to be linked once they are live. */
  social: {
    instagram: PLACEHOLDER,
    facebook: PLACEHOLDER,
    linkedin: PLACEHOLDER,
    whatsapp: "https://wa.me/923122031534",
  },

  /** The three owners. Named people are the strongest trust signal a B2B
   *  supplier has — a buyer committing to a 500-unit run wants to know who
   *  they are dealing with. */
  owners: [
    { name: "Muhammad Bilal Atique", role: "Co-founder" },
    { name: "Kaif Zafar", role: "Co-founder" },
    { name: "Abdul Hannan Soomro", role: "Co-founder" },
  ],

  /**
   * Production timings quoted to customers. These drive the order confirmation
   * email and the configurator summary, so they must be real.
   */
  production: {
    standardLeadTimeDays: PLACEHOLDER,
    bulkLeadTimeDays: PLACEHOLDER,
    minimumBulkQuantity: 12,
  },
};

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
    description: "Specify your jacket panel by panel and request a quote.",
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
  { label: "Trade Pricing", detail: "Quoted per run, tiered from 12 units" },
  { label: "Private Label", detail: "Your pattern, spec, labels and hardware" },
  { label: "Full-Grain Leather", detail: "Jackets, bags, belts and wallets" },
  { label: "Sublimated Jerseys", detail: "Full-colour, edge-to-edge, any run size" },
] as const;
