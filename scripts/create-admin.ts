import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

/**
 * Create or reset the admin login.
 *
 *   ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="a-long-password" npm run admin:create
 *
 * Separate from `db:seed` because this is the one command an owner will
 * actually need again — to add a second person, or to reset a forgotten
 * password — and they should not have to re-run a catalogue seed to do it.
 */

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim();

  if (!connectionString) {
    console.error(
      "\n✖ No database connection.\n\n" +
        "  Set DATABASE_URL and DIRECT_URL in .env first.\n" +
        "  See docs/ADMIN.md for where to get them.\n",
    );
    process.exit(1);
  }

  if (!email || !password) {
    console.error(
      "\n✖ Missing credentials.\n\n" +
        "  Set both in .env, then run this again:\n\n" +
        '    ADMIN_EMAIL="you@example.com"\n' +
        '    ADMIN_PASSWORD="choose-something-long"\n',
    );
    process.exit(1);
  }

  // This account can read every customer's address and change every price.
  if (password.length < 12) {
    console.error(
      `\n✖ Password is ${password.length} characters; 12 is the minimum.\n\n` +
        "  This login can read every customer address and change every price.\n" +
        "  A short password here is the whole security model undone.\n",
    );
    process.exit(1);
  }

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const existing = await db.adminUser.findUnique({ where: { email } });
    const passwordHash = await bcrypt.hash(password, 12);

    await db.adminUser.upsert({
      where: { email },
      // Bumping tokenVersion signs out every existing session for this user,
      // which is exactly what a password reset should do.
      update: { passwordHash, active: true, tokenVersion: { increment: 1 } },
      create: {
        email,
        passwordHash,
        name: name ?? "Studio Owner",
        role: "OWNER",
      },
    });

    const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/admin/login`;

    console.log(
      `\n✔ ${existing ? "Password reset for" : "Admin created:"} ${email}\n\n` +
        `  Sign in at: ${url}\n\n` +
        (existing
          ? "  All previous sessions for this account have been signed out.\n\n"
          : "") +
        "  Now DELETE ADMIN_PASSWORD from your .env — it is not needed again,\n" +
        "  and a plaintext password sitting in a file is the easiest thing to leak.\n",
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("\n✖ Failed:\n", error);
  process.exit(1);
});
