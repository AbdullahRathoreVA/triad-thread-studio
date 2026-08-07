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
 * ─── Why this is lazy ─────────────────────────────────────────────────────
 * Connecting eagerly at module scope looks tidier, but it throws the moment
 * anything *imports* this file — which during `next build` happens while
 * collecting page data, long before any request. Every caller wraps its query
 * in try/catch expecting to degrade to a fallback, and none of those catches
 * ever ran, because the failure was at import time rather than call time. A
 * missing DATABASE_URL took the entire production build down.
 *
 * Deferring to first property access puts the error inside the caller's
 * try/catch, where it was always meant to be: the marketing site, the
 * configurator and the sitemap all build and serve fine with no database, and
 * only the pages that genuinely need one show their setup notice.
 * ─────────────────────────────────────────────────────────────────────────
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in — " +
        "see docs/GOING-LIVE.md for how to get one from Supabase.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function client(): PrismaClient {
  // The global cache is not a micro-optimisation: Next.js hot-reload
  // re-evaluates modules on every edit, and without it dev would leak a
  // connection pool per save until Postgres refuses new clients.
  if (!globalForPrisma.prisma) {
    const created = createClient();
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = created;
    else globalForPrisma.prisma = created;
  }
  return globalForPrisma.prisma;
}

/**
 * A proxy so `db.order.findMany()` behaves exactly like a real client, while
 * construction is deferred until the first property is actually read.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const value = Reflect.get(client(), property, receiver);
    return typeof value === "function" ? value.bind(client()) : value;
  },
});
