import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma CLI configuration (Prisma 7).
 *
 * `datasource.url` here is used by the CLI for migrate/push/studio only.
 * It points at DIRECT_URL — Supabase's pooled connection (DATABASE_URL) uses
 * PgBouncer in transaction mode, which cannot run DDL. The application runtime
 * uses the pooled URL through the driver adapter in src/lib/db.ts.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Guarded: `prisma generate` runs during the Vercel build, where DIRECT_URL
  // may legitimately be absent. Generate needs no connection — only migrate
  // and studio do — so an unset value must not fail the build.
  datasource: {
    url: process.env.DIRECT_URL ? env("DIRECT_URL") : "postgresql://unset",
  },
});
