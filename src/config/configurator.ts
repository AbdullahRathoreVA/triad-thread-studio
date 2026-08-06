/**
 * The custom jacket specification, as data.
 *
 * Every option lives here rather than in component code, so the admin CMS can
 * add a leather, retire a collar or reprice hardware without a deploy — and so
 * the price engine and the 3D preview read from one identical source.
 *
 * Money is ALWAYS integer minor units (cents). No floats anywhere in pricing.
 */

export type PriceRule =
  /** Flat amount added to the running subtotal, in cents. */
  | { kind: "add"; cents: number }
  /** Multiplier applied to the style's base price. 1.25 = +25%. */
  | { kind: "multiplyBase"; factor: number }
  /** Charged per unit of something (per character, per 1000 stitches). */
  | { kind: "perUnit"; cents: number };

export type Option = {
  id: string;
  label: string;
  description?: string;
  price: PriceRule;
  /** Hex used by the live 3D preview. */
  swatch?: string;
  /** Worley cell size for the procedural grain, in px. */
  grain?: number;
  /** 0 = patent gloss, 1 = raw matte. */
  roughness?: number;
  /** Additional working days this option adds to the quoted lead time. */
  leadTimeDays?: number;
  soldOut?: boolean;
};

export type OptionGroup = {
  id: string;
  label: string;
  /** Grouped into wizard steps in the UI. */
  step: "silhouette" | "material" | "construction" | "hardware" | "personalisation" | "fit";
  helpText?: string;
  required: boolean;
  /** `single` = radio, `multi` = checkboxes, `text` = free input, `measure` = numeric set. */
  type: "single" | "multi" | "text" | "measure";
  options?: Option[];
  /** For `text` groups. */
  maxLength?: number;
  pricePerCharacter?: number;
};

const FREE: PriceRule = { kind: "add", cents: 0 };

export const STYLES: Option[] = [
  {
    id: "biker",
    label: "Biker / Moto",
    description: "Asymmetric zip, wide notch lapel, belted hem.",
    price: { kind: "add", cents: 34_900 },
    leadTimeDays: 0,
  },
  {
    id: "bomber",
    label: "Bomber",
    description: "Ribbed collar, cuffs and hem. Straight centre zip.",
    price: { kind: "add", cents: 31_900 },
  },
  {
    id: "racer",
    label: "Café Racer",
    description: "Minimal band collar, clean front, no lapel.",
    price: { kind: "add", cents: 29_900 },
  },
  {
    id: "trucker",
    label: "Trucker",
    description: "Shirt collar, chest flap pockets, button front.",
    price: { kind: "add", cents: 32_900 },
  },
  {
    id: "moto-protective",
    label: "Motorcycle Protective",
    description: "Heavier hide, CE armour pockets at shoulder, elbow and back.",
    price: { kind: "add", cents: 52_900 },
    leadTimeDays: 7,
  },
  {
    id: "long-coat",
    label: "Long Coat",
    description: "Below-knee, full-skirt cut. Significantly more hide.",
    price: { kind: "add", cents: 61_900 },
    leadTimeDays: 5,
  },
];

export const LEATHERS: Option[] = [
  {
    id: "cowhide-full",
    label: "Full-Grain Cowhide",
    description: "The house standard. Dense, hard-wearing, develops a patina.",
    price: { kind: "multiplyBase", factor: 1.0 },
    swatch: "#45271a",
    grain: 26,
    roughness: 0.58,
  },
  {
    id: "lambskin",
    label: "Napa Lambskin",
    description: "Feather-light with a fluid drape. Softest option; marks more easily.",
    price: { kind: "multiplyBase", factor: 1.22 },
    swatch: "#2e1b12",
    grain: 15,
    roughness: 0.42,
  },
  {
    id: "goatskin",
    label: "Goatskin",
    description: "Pronounced pebble grain, unusually strong for its weight.",
    price: { kind: "multiplyBase", factor: 1.14 },
    swatch: "#553729",
    grain: 34,
    roughness: 0.66,
  },
  {
    id: "buffalo",
    label: "Buffalo Hide",
    description: "Heaviest and most textured. Built for abrasion resistance.",
    price: { kind: "multiplyBase", factor: 1.18 },
    swatch: "#351809",
    grain: 44,
    roughness: 0.74,
  },
  {
    id: "suede",
    label: "Calf Suede",
    description: "Napped finish, matte throughout. Not recommended for wet climates.",
    price: { kind: "multiplyBase", factor: 1.1 },
    swatch: "#664837",
    grain: 10,
    roughness: 0.94,
  },
  {
    id: "vegan",
    label: "Recycled Vegan Leather",
    description: "Polyurethane on recycled backing. No animal product.",
    price: { kind: "multiplyBase", factor: 0.82 },
    swatch: "#1c1b19",
    grain: 20,
    roughness: 0.5,
  },
];

export const COLOURS: Option[] = [
  { id: "jet", label: "Jet Black", price: FREE, swatch: "#141210" },
  { id: "espresso", label: "Espresso", price: FREE, swatch: "#2e1b12" },
  { id: "chestnut", label: "Chestnut", price: FREE, swatch: "#5c3a26" },
  { id: "cognac", label: "Cognac", price: { kind: "add", cents: 2_500 }, swatch: "#7a4a24" },
  { id: "oxblood", label: "Oxblood", price: { kind: "add", cents: 2_500 }, swatch: "#4a1418" },
  { id: "bone", label: "Bone", price: { kind: "add", cents: 4_000 }, swatch: "#cfc6b6" },
  { id: "tobacco", label: "Tobacco", price: { kind: "add", cents: 2_500 }, swatch: "#6b4a2a" },
  {
    id: "custom-dye",
    label: "Custom Dye Match",
    description: "Matched to a Pantone reference you supply.",
    price: { kind: "add", cents: 12_000 },
    swatch: "#8a6b55",
    leadTimeDays: 10,
  },
];

export const FINISHES: Option[] = [
  { id: "matte", label: "Matte", price: FREE, roughness: 0.82 },
  { id: "semi-aniline", label: "Semi-Aniline", price: { kind: "add", cents: 3_000 }, roughness: 0.55 },
  { id: "waxed", label: "Hand-Waxed Pull-Up", price: { kind: "add", cents: 6_500 }, roughness: 0.46 },
  { id: "distressed", label: "Distressed / Vintage", price: { kind: "add", cents: 7_500 }, roughness: 0.7, leadTimeDays: 3 },
  { id: "patent", label: "High-Gloss Patent", price: { kind: "add", cents: 8_500 }, roughness: 0.12 },
];

export const COLLARS: Option[] = [
  { id: "notch", label: "Notch Lapel", price: FREE },
  { id: "band", label: "Band / Mandarin", price: FREE },
  { id: "shirt", label: "Shirt Collar", price: FREE },
  { id: "hood", label: "Detachable Hood", price: { kind: "add", cents: 9_500 }, leadTimeDays: 3 },
  { id: "shearling", label: "Shearling Collar", price: { kind: "add", cents: 14_500 }, leadTimeDays: 4 },
];

export const SLEEVES: Option[] = [
  { id: "set-in", label: "Set-In", price: FREE },
  { id: "raglan", label: "Raglan", price: { kind: "add", cents: 3_500 } },
  { id: "zip-off", label: "Zip-Off (converts to vest)", price: { kind: "add", cents: 11_000 }, leadTimeDays: 4 },
  { id: "quilted", label: "Quilted Panel", price: { kind: "add", cents: 6_000 } },
];

export const LENGTHS: Option[] = [
  { id: "cropped", label: "Cropped", price: FREE },
  { id: "regular", label: "Regular", price: FREE },
  { id: "longline", label: "Longline", price: { kind: "add", cents: 5_500 } },
];

export const FITS: Option[] = [
  { id: "slim", label: "Slim", price: FREE },
  { id: "regular", label: "Regular", price: FREE },
  { id: "relaxed", label: "Relaxed", price: FREE },
  { id: "oversized", label: "Oversized", price: { kind: "add", cents: 3_000 } },
];

export const HARDWARE: Option[] = [
  { id: "gunmetal", label: "Gunmetal", price: FREE, swatch: "#4a4d52" },
  { id: "antique-brass", label: "Antique Brass", price: { kind: "add", cents: 3_500 }, swatch: "#8a6b3a" },
  { id: "polished-nickel", label: "Polished Nickel", price: { kind: "add", cents: 3_500 }, swatch: "#c2c6cb" },
  { id: "matte-black", label: "Matte Black", price: { kind: "add", cents: 2_500 }, swatch: "#1a1a1a" },
  { id: "ykk-excella", label: "YKK Excella (premium)", price: { kind: "add", cents: 9_000 }, swatch: "#d8dadd" },
];

export const POCKETS: Option[] = [
  { id: "welt", label: "Welt", price: FREE },
  { id: "zip", label: "Zippered", price: { kind: "add", cents: 2_500 } },
  { id: "flap", label: "Flap", price: { kind: "add", cents: 2_500 } },
  { id: "patch", label: "Patch", price: FREE },
  { id: "concealed", label: "Concealed Interior Carry", price: { kind: "add", cents: 6_500 } },
];

export const LININGS: Option[] = [
  { id: "polyester", label: "Polyester Twill", price: FREE, swatch: "#1a1a1a" },
  { id: "viscose", label: "Viscose", price: { kind: "add", cents: 3_500 }, swatch: "#22201d" },
  { id: "satin", label: "Satin", price: { kind: "add", cents: 5_500 }, swatch: "#2a2620" },
  { id: "quilted-thermal", label: "Quilted Thermal", price: { kind: "add", cents: 9_500 }, swatch: "#2e2a24" },
  { id: "shearling-full", label: "Full Shearling", price: { kind: "add", cents: 24_000 }, swatch: "#c9bda6", leadTimeDays: 7 },
];

export const THREAD_COLOURS: Option[] = [
  { id: "tonal", label: "Tonal (matches hide)", price: FREE, swatch: "#45271a" },
  { id: "contrast-ivory", label: "Contrast Ivory", price: { kind: "add", cents: 1_500 }, swatch: "#e8e0d0" },
  { id: "contrast-gold", label: "Contrast Gold", price: { kind: "add", cents: 2_000 }, swatch: "#b79976" },
  { id: "contrast-red", label: "Contrast Red", price: { kind: "add", cents: 1_500 }, swatch: "#8a1f22" },
];

/** Embroidery is priced by area, because that is how stitch time actually scales. */
export const EMBROIDERY: Option[] = [
  { id: "none", label: "None", price: FREE },
  { id: "small", label: "Small — up to 3in", description: "Chest or cuff.", price: { kind: "add", cents: 4_500 }, leadTimeDays: 2 },
  { id: "medium", label: "Medium — up to 6in", price: { kind: "add", cents: 8_500 }, leadTimeDays: 3 },
  { id: "large-back", label: "Large Back Panel — up to 12in", price: { kind: "add", cents: 19_500 }, leadTimeDays: 5 },
];

export const PRINTING: Option[] = [
  { id: "none", label: "None", price: FREE },
  { id: "screen-1", label: "Screen Print — 1 colour", price: { kind: "add", cents: 3_500 }, leadTimeDays: 2 },
  { id: "screen-multi", label: "Screen Print — full colour", price: { kind: "add", cents: 7_500 }, leadTimeDays: 3 },
  { id: "sublimation", label: "Full Sublimation Panel", description: "Jerseys and synthetic panels only.", price: { kind: "add", cents: 9_500 }, leadTimeDays: 3 },
  { id: "heat-transfer", label: "Heat Transfer Vinyl", price: { kind: "add", cents: 2_500 }, leadTimeDays: 1 },
];

export const SIZES: Option[] = [
  { id: "xs", label: "XS", price: FREE },
  { id: "s", label: "S", price: FREE },
  { id: "m", label: "M", price: FREE },
  { id: "l", label: "L", price: FREE },
  { id: "xl", label: "XL", price: FREE },
  { id: "xxl", label: "2XL", price: { kind: "add", cents: 3_500 } },
  { id: "xxxl", label: "3XL", price: { kind: "add", cents: 5_500 } },
  {
    id: "made-to-measure",
    label: "Made to Measure",
    description: "Your measurements, graded to a bespoke pattern.",
    price: { kind: "add", cents: 14_500 },
    leadTimeDays: 7,
  },
];

export const GENDERS: Option[] = [
  { id: "mens", label: "Men's", price: FREE },
  { id: "womens", label: "Women's", price: FREE },
  { id: "unisex", label: "Unisex", price: FREE },
];

/** Measurement fields shown when size = made-to-measure. Values in cm. */
export const MEASUREMENTS = [
  { id: "chest", label: "Chest", min: 60, max: 160 },
  { id: "waist", label: "Waist", min: 50, max: 160 },
  { id: "hips", label: "Hips", min: 60, max: 170 },
  { id: "shoulder", label: "Shoulder width", min: 30, max: 70 },
  { id: "sleeveLength", label: "Sleeve length", min: 40, max: 90 },
  { id: "backLength", label: "Back length", min: 40, max: 110 },
  { id: "bicep", label: "Bicep", min: 20, max: 60 },
  { id: "neck", label: "Neck", min: 25, max: 60 },
] as const;

/* ==========================================================================
   SUBLIMATED JERSEYS
   A separate line with its own economics: cheap per unit, priced almost
   entirely on print coverage and per-name/number personalisation, and sold
   in team-sized runs rather than singles.
   ========================================================================== */

export const JERSEY_STYLES: Option[] = [
  {
    id: "football",
    label: "Football / Soccer",
    description: "Standard fit, short sleeve, crew or V neck.",
    price: { kind: "add", cents: 2_400 },
  },
  {
    id: "basketball",
    label: "Basketball",
    description: "Sleeveless, deep armhole, matching shorts available.",
    price: { kind: "add", cents: 2_600 },
  },
  {
    id: "cricket",
    label: "Cricket",
    description: "Collared, long or short sleeve, breathable panels.",
    price: { kind: "add", cents: 2_800 },
  },
  {
    id: "esports",
    label: "Esports / Gaming",
    description: "Relaxed fit, heavy sponsor placement, stand collar.",
    price: { kind: "add", cents: 2_900 },
  },
  {
    id: "training",
    label: "Training / Warm-up",
    description: "Lightweight everyday kit for squad training.",
    price: { kind: "add", cents: 2_100 },
  },
];

export const JERSEY_FABRICS: Option[] = [
  {
    id: "poly-interlock",
    label: "Polyester Interlock",
    description: "The workhorse. Smooth face, holds colour, hard-wearing.",
    price: { kind: "multiplyBase", factor: 1.0 },
    swatch: "#2a2825",
  },
  {
    id: "poly-mesh",
    label: "Micro-Mesh Polyester",
    description: "Perforated for airflow. Best for hot-weather play.",
    price: { kind: "multiplyBase", factor: 1.14 },
    swatch: "#33302c",
  },
  {
    id: "poly-spandex",
    label: "Poly / Spandex Stretch",
    description: "Four-way stretch, closer body fit.",
    price: { kind: "multiplyBase", factor: 1.26 },
    swatch: "#26241f",
  },
  {
    id: "recycled-poly",
    label: "Recycled Polyester",
    description: "Made from post-consumer PET. Same hand, lower footprint.",
    price: { kind: "multiplyBase", factor: 1.18 },
    swatch: "#2d2b26",
  },
];

export const JERSEY_FITS: Option[] = [
  { id: "athletic", label: "Athletic", price: FREE },
  { id: "regular", label: "Regular", price: FREE },
  { id: "relaxed", label: "Relaxed", price: FREE },
  { id: "womens", label: "Women's Cut", price: FREE },
  { id: "youth", label: "Youth", price: { kind: "add", cents: -300 } },
];

export const JERSEY_SLEEVES: Option[] = [
  { id: "short", label: "Short Sleeve", price: FREE },
  { id: "sleeveless", label: "Sleeveless", price: FREE },
  { id: "long", label: "Long Sleeve", price: { kind: "add", cents: 500 } },
  { id: "raglan-contrast", label: "Contrast Raglan", price: { kind: "add", cents: 400 } },
];

export const JERSEY_COLLARS: Option[] = [
  { id: "crew", label: "Crew Neck", price: FREE },
  { id: "v-neck", label: "V-Neck", price: FREE },
  { id: "polo", label: "Polo Collar", price: { kind: "add", cents: 900 } },
  { id: "stand", label: "Stand Collar", price: { kind: "add", cents: 700 } },
];

/** Sublimation is priced by coverage, because that is how ink and time scale. */
export const JERSEY_PRINT: Option[] = [
  {
    id: "front-only",
    label: "Front Panel Only",
    price: { kind: "add", cents: 600 },
  },
  {
    id: "front-back",
    label: "Front & Back",
    price: { kind: "add", cents: 1_100 },
  },
  {
    id: "all-over",
    label: "All-Over, Edge to Edge",
    description: "Full garment including sleeves and side panels.",
    price: { kind: "add", cents: 1_900 },
    leadTimeDays: 2,
  },
];

export const JERSEY_NUMBERS: Option[] = [
  { id: "none", label: "No Numbers", price: FREE },
  { id: "back", label: "Back Number", price: { kind: "add", cents: 350 } },
  {
    id: "back-front",
    label: "Back & Front Number",
    price: { kind: "add", cents: 550 },
  },
  {
    id: "back-front-shorts",
    label: "Back, Front & Shorts",
    price: { kind: "add", cents: 750 },
  },
];

export const JERSEY_NAMES: Option[] = [
  { id: "none", label: "No Names", price: FREE },
  {
    id: "player-names",
    label: "Individual Player Names",
    description: "Supply your roster; each shirt is printed to its player.",
    price: { kind: "add", cents: 600 },
    leadTimeDays: 2,
  },
];

export const JERSEY_SIZES: Option[] = [
  { id: "size-run", label: "Mixed Size Run", description: "Supply your size breakdown.", price: FREE },
  { id: "youth-run", label: "Youth Size Run", price: FREE },
  { id: "single-size", label: "Single Size", price: FREE },
];

/** Jacket option groups. Kept as OPTION_GROUPS for backwards compatibility. */
export const OPTION_GROUPS: OptionGroup[] = [
  { id: "gender", label: "Cut", step: "silhouette", required: true, type: "single", options: GENDERS },
  { id: "style", label: "Style", step: "silhouette", required: true, type: "single", options: STYLES },
  { id: "length", label: "Length", step: "silhouette", required: true, type: "single", options: LENGTHS },
  { id: "fit", label: "Fit", step: "silhouette", required: true, type: "single", options: FITS },

  { id: "leather", label: "Leather", step: "material", required: true, type: "single", options: LEATHERS },
  { id: "colour", label: "Colour", step: "material", required: true, type: "single", options: COLOURS },
  { id: "finish", label: "Finish", step: "material", required: true, type: "single", options: FINISHES },

  { id: "collar", label: "Collar", step: "construction", required: true, type: "single", options: COLLARS },
  { id: "sleeves", label: "Sleeves", step: "construction", required: true, type: "single", options: SLEEVES },
  { id: "pockets", label: "Pockets", step: "construction", required: true, type: "single", options: POCKETS },
  { id: "lining", label: "Inner lining", step: "construction", required: true, type: "single", options: LININGS },
  { id: "thread", label: "Thread colour", step: "construction", required: true, type: "single", options: THREAD_COLOURS },

  { id: "hardware", label: "Zips & hardware", step: "hardware", required: true, type: "single", options: HARDWARE },

  { id: "embroideryFront", label: "Front embroidery", step: "personalisation", required: false, type: "single", options: EMBROIDERY },
  { id: "embroideryBack", label: "Back embroidery", step: "personalisation", required: false, type: "single", options: EMBROIDERY },
  { id: "printing", label: "Printed logo / graphic", step: "personalisation", required: false, type: "single", options: PRINTING },
  {
    id: "customText",
    label: "Custom text",
    step: "personalisation",
    required: false,
    type: "text",
    maxLength: 24,
    pricePerCharacter: 180,
    helpText: "Stitched lettering. Priced per character.",
  },
  {
    id: "initials",
    label: "Initials",
    step: "personalisation",
    required: false,
    type: "text",
    maxLength: 4,
    pricePerCharacter: 450,
    helpText: "Monogrammed at the inside pocket or cuff.",
  },

  { id: "size", label: "Size", step: "fit", required: true, type: "single", options: SIZES },
  { id: "measurements", label: "Measurements", step: "fit", required: false, type: "measure" },
];

export const JERSEY_GROUPS: OptionGroup[] = [
  { id: "style", label: "Sport", step: "silhouette", required: true, type: "single", options: JERSEY_STYLES },
  { id: "fit", label: "Fit", step: "silhouette", required: true, type: "single", options: JERSEY_FITS },

  { id: "fabric", label: "Fabric", step: "material", required: true, type: "single", options: JERSEY_FABRICS },

  { id: "sleeves", label: "Sleeves", step: "construction", required: true, type: "single", options: JERSEY_SLEEVES },
  { id: "collar", label: "Collar", step: "construction", required: true, type: "single", options: JERSEY_COLLARS },

  { id: "print", label: "Sublimation coverage", step: "personalisation", required: true, type: "single", options: JERSEY_PRINT, helpText: "Priced by coverage — that is how ink and press time actually scale." },
  { id: "numbers", label: "Numbers", step: "personalisation", required: false, type: "single", options: JERSEY_NUMBERS },
  { id: "names", label: "Player names", step: "personalisation", required: false, type: "single", options: JERSEY_NAMES },
  {
    id: "teamName",
    label: "Team or club name",
    step: "personalisation",
    required: false,
    type: "text",
    maxLength: 28,
    pricePerCharacter: 40,
    helpText: "Printed across the chest or back yoke.",
  },

  { id: "size", label: "Size run", step: "fit", required: true, type: "single", options: JERSEY_SIZES },
];

export type ProductType = "jacket" | "jersey";

export const PRODUCT_TYPES: {
  id: ProductType;
  label: string;
  blurb: string;
  groups: OptionGroup[];
}[] = [
  {
    id: "jacket",
    label: "Leather Jacket",
    blurb: "Cut, stitched and finished from full hides.",
    groups: OPTION_GROUPS,
  },
  {
    id: "jersey",
    label: "Sublimated Jersey",
    blurb: "Full-colour team kit, printed edge to edge.",
    groups: JERSEY_GROUPS,
  },
];

/** Single lookup used by the price engine, validation and the UI alike. */
export function groupsFor(productType: ProductType): OptionGroup[] {
  return productType === "jersey" ? JERSEY_GROUPS : OPTION_GROUPS;
}

export const STEPS = [
  { id: "silhouette", label: "Silhouette", n: "01" },
  { id: "material", label: "Material", n: "02" },
  { id: "construction", label: "Construction", n: "03" },
  { id: "hardware", label: "Hardware", n: "04" },
  { id: "personalisation", label: "Personalisation", n: "05" },
  { id: "fit", label: "Fit & Size", n: "06" },
] as const;

/** Steps that actually contain groups for the given product. */
export function stepsFor(productType: ProductType) {
  const groups = groupsFor(productType);
  return STEPS.filter((s) => groups.some((g) => g.step === s.id)).map(
    (s, i) => ({ ...s, n: String(i + 1).padStart(2, "0") }),
  );
}

/**
 * Bulk tiers. Thresholds are inclusive lower bounds; the engine picks the
 * highest tier the quantity qualifies for.
 */
export const BULK_TIERS = [
  { minQty: 1, discountBps: 0, label: "Single piece" },
  { minQty: 12, discountBps: 800, label: "12+ — 8%" },
  { minQty: 50, discountBps: 1400, label: "50+ — 14%" },
  { minQty: 150, discountBps: 2000, label: "150+ — 20%" },
  { minQty: 500, discountBps: 2600, label: "500+ — 26%" },
  { minQty: 1000, discountBps: 3200, label: "1000+ — 32%" },
] as const;

/** Base production lead time before any option-specific additions. */
export const BASE_LEAD_TIME_DAYS = 14;

/** Flat-rate shipping by destination band, in cents. Free above the threshold. */
export const SHIPPING = {
  domestic: { cents: 1_500, label: "Domestic" },
  international: { cents: 4_500, label: "International" },
  freeAboveCents: 75_000,
} as const;
