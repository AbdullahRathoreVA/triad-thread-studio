# Deployment

Everything below is free-tier.

---

## 1. Database — Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string**. You need **both**:

   | Variable | Port | Used by |
   |---|---|---|
   | `DATABASE_URL` | **6543** (pooled, `?pgbouncer=true`) | The running app |
   | `DIRECT_URL` | **5432** (direct) | Prisma CLI only |

   This split is not optional. Serverless functions open and discard
   connections constantly and will exhaust Postgres without the pooler — but
   PgBouncer in transaction mode cannot execute DDL, so migrations need the
   direct connection.

3. Apply the schema and seed:

```bash
npm run db:push
npm run db:seed
```

The seed reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` to create the owner account.
**Remove both from the environment once it has run** — re-running rotates the
password and invalidates every active session.

---

## 2. Email — Resend

1. Create an API key at [resend.com](https://resend.com) → `RESEND_API_KEY`.
2. Verify your sending domain. `EMAIL_FROM` must be an address on a verified
   domain — a Gmail address will be rejected.
3. `EMAIL_TO_INTERNAL` is where enquiries land.

With no key set, sends become logged no-ops. Development never breaks, and it
never silently pretends an email went out.

---

## 3. Media — Cloudinary

1. `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` from the dashboard.
2. Create an **unsigned** upload preset for customer reference images →
   `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.
3. `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` are server-side only.
   **Never** prefix these with `NEXT_PUBLIC_` — that ships them to every
   visitor's browser.

`res.cloudinary.com` is already allow-listed in `next.config.ts` and the CSP.

---

## 4. Auth secret

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Set as `AUTH_SECRET`. Minimum 32 characters — the app throws on startup
otherwise rather than signing tokens with something guessable. Rotating it
immediately invalidates every admin session.

---

## 5. Vercel

1. Import the repository.
2. Add every variable from `.env.example` under **Settings → Environment
   Variables**.
3. Set `NEXT_PUBLIC_SITE_URL` to the production origin, no trailing slash. It
   drives canonical URLs, OG tags, the sitemap and all structured data — a
   wrong value here silently poisons your SEO.
4. Deploy.

Preview deployments automatically serve `Disallow: /` (see `robots.ts`), so
branch builds never compete with production in search results.

---

## 6. Pre-launch gate

```bash
npm run check:placeholders
```

Fails while any business detail in `src/config/site.ts` is still
`PLACEHOLDER`, or any required env var is missing. Wire it in ahead of the
production deploy step.

It exists because the most damaging thing this site could do is go live
quoting an invented phone number or a lead time nobody can honour.

---

## Environment reference

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Yes | No trailing slash |
| `DATABASE_URL` | Yes | Pooled, port 6543 |
| `DIRECT_URL` | Yes | Direct, port 5432 — migrations only |
| `AUTH_SECRET` | Yes | ≥32 chars |
| `RESEND_API_KEY` | Yes | Emails no-op without it |
| `EMAIL_FROM` | Yes | Verified domain |
| `EMAIL_TO_INTERNAL` | Recommended | Enquiry destination |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed only | Delete after seeding |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | For uploads | |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | For uploads | Unsigned |
| `CLOUDINARY_API_KEY` / `_SECRET` | Server only | Never `NEXT_PUBLIC_` |

---

## Troubleshooting

**`Native module not found: node:util/types`** — something Node-only reached
the Edge runtime. Almost always middleware importing `@/lib/auth` (Prisma +
bcrypt) instead of `@/lib/session`.

**`useSearchParams() should be wrapped in a suspense boundary`** — a client
component reads search params without a `<Suspense>` ancestor. See
`app/admin/login/page.tsx` for the pattern.

**Admin shows "Database not reachable"** — expected without `DATABASE_URL`.
The page degrades to setup instructions rather than a 500.
