import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma 7 client, using the Rust-free `pg` driver adapter.
 *
 * The adapter takes the POOLED connection string (Supabase's PgBouncer
 * endpoint) because serverless functions open and discard connections
 * constantly and would otherwise exhaust Postgres' connection limit.
 * Migrations use DIRECT_URL instead — see prisma.config.ts.
 *
 * The global cache is not a micro-optimisation: Next.js hot-reload re-evaluates
 * modules on every edit, and without it dev would leak a connection pool per
 * save until Postgres refuses new clients.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in — " +
        "see docs/DEPLOYMENT.md for how to get one from Supabase.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
