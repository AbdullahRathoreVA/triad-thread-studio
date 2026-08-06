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
  datasource: {
    url: env("DIRECT_URL"),
  },
});
