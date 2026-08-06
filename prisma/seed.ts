import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

/**
 * Idempotent seed. Safe to run repeatedly — every write is an upsert keyed on
 * a natural unique field, so re-running never duplicates or clobbers edits
 * made through the admin UI.
 */

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL (or DATABASE_URL) must be set to seed.");
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      "→ Skipping admin user: ADMIN_EMAIL / ADMIN_PASSWORD not set.\n" +
        "  Set both, re-run the seed, then remove them from the environment.",
    );
    return;
  }

  if (password.length < 12) {
    throw new Error(
      "ADMIN_PASSWORD must be at least 12 characters. This account can edit " +
        "prices and read every customer address — it is worth a real password.",
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.adminUser.upsert({
    where: { email: email.toLowerCase() },
    // Re-seeding rotates the password and invalidates existing sessions.
    update: { passwordHash, active: true, tokenVersion: { increment: 1 } },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      name: "Studio Owner",
      role: "OWNER",
    },
  });

  console.log(`✔ Admin owner ready: ${email}`);
}

async function seedCollections() {
  const collections = [
    {
      slug: "mens-leather-jackets",
      title: "Men's Leather Jackets",
      subtitle: "Biker, bomber, racer and trucker cuts",
      description:
        "Our core men's range, cut from full-grain and top-grain hides. Every piece can be reworked to your measurements or produced in volume for your label.",
      position: 1,
    },
    {
      slug: "womens-leather-jackets",
      title: "Women's Leather Jackets",
      subtitle: "Tailored through the waist and shoulder",
      description:
        "Patterns graded specifically for a women's fit rather than scaled down from a men's block — the difference shows in the shoulder and the sleeve pitch.",
      position: 2,
    },
    {
      slug: "motorcycle",
      title: "Motorcycle & Protective",
      subtitle: "Heavier hides, armour-ready construction",
      description:
        "Built on thicker leather with pockets for CE-rated armour at shoulder, elbow and back, and bar-tacked stress points throughout.",
      position: 3,
    },
    {
      slug: "leather-goods",
      title: "Leather Goods",
      subtitle: "Bags, wallets, belts and small leather goods",
      description:
        "The same hides and the same hand-finished edges, applied to everyday carry.",
      position: 4,
    },
    {
      slug: "sublimated-jerseys",
      title: "Sublimated Jerseys",
      subtitle: "Full-colour, edge-to-edge printing",
      description:
        "Dye-sublimated performance jerseys for teams and clubs. Colour is bonded into the fabric, so it will not crack, peel or fade like a printed transfer.",
      position: 5,
    },
  ];

  for (const collection of collections) {
    await db.collection.upsert({
      where: { slug: collection.slug },
      update: collection,
      create: { ...collection, published: true },
    });
  }

  console.log(`✔ ${collections.length} collections`);
}

async function seedFaqs() {
  const faqs = [
    {
      question: "Do you sell to individuals, or only to businesses?",
      answer:
        "Both. A single custom jacket is as welcome as a thousand-unit production run. Bulk pricing begins automatically at 12 units.",
      category: "Ordering",
      position: 1,
    },
    {
      question: "How long does a custom jacket take?",
      answer:
        "Standard production is quoted live in the Custom Studio and depends on your specification. Options such as custom dye matching, full shearling lining or made-to-measure grading add to that, and the studio shows exactly how much before you order.",
      category: "Production",
      position: 2,
    },
    {
      question: "Can you manufacture to our own pattern and label?",
      answer:
        "Yes. Send your tech pack, pattern or a physical sample and we will quote against it. We produce under our clients' own labels routinely.",
      category: "Wholesale",
      position: 3,
    },
    {
      question: "What is the difference between full-grain and top-grain leather?",
      answer:
        "Full-grain keeps the hide's outermost layer intact, including its natural markings. It is the strongest option and develops a patina with wear. Top-grain is sanded to remove imperfections, giving a more uniform surface that stays closer to its original appearance.",
      category: "Materials",
      position: 4,
    },
    {
      question: "How should I measure myself for a made-to-measure jacket?",
      answer:
        "Measure over a light shirt, keeping the tape level and snug but not tight. The Custom Studio asks for chest, waist, hips, shoulder width, sleeve length, back length, bicep and neck. If you are unsure, send us your measurements and we will check them before cutting.",
      category: "Fit",
      position: 5,
    },
  ];

  for (const faq of faqs) {
    const existing = await db.faq.findFirst({ where: { question: faq.question } });
    if (existing) {
      await db.faq.update({ where: { id: existing.id }, data: faq });
    } else {
      await db.faq.create({ data: faq });
    }
  }

  console.log(`✔ ${faqs.length} FAQs`);
}

async function seedCoupons() {
  await db.coupon.upsert({
    where: { code: "STUDIO10" },
    update: {},
    create: {
      code: "STUDIO10",
      description: "10% introductory discount",
      percentOffBps: 1000,
      active: false, // Deliberately off. Activate in admin when a campaign runs.
    },
  });

  console.log("✔ Coupons (STUDIO10 created inactive)");
}

async function main() {
  console.log("\nSeeding Triad Thread Studio…\n");
  await seedAdmin();
  await seedCollections();
  await seedFaqs();
  await seedCoupons();

  console.log(
    "\nDone.\n\n" +
      "NOTE: no products were seeded. Product records carry real prices,\n" +
      "photography and copy — inventing those would put fictional goods on a\n" +
      "live storefront. Add them through /admin once you have real details.\n",
  );
}

main()
  .catch((error) => {
    console.error("\nSeed failed:\n", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
