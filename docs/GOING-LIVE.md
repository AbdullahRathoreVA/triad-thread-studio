# Going live

## Why not GitHub Pages

GitHub Pages serves static files only. This site needs a Node server for:

- `POST /api/orders` and `/api/enquiries` — quote requests
- Admin session middleware and login
- Prisma database access
- Image optimisation

On Pages the pages would render but every quote request would fail silently.
That is a limitation of Pages, not something a setting can change.

**Vercel** is the right host — same GitHub workflow, push to `main` and it
redeploys. Free tier, built by the Next.js team.

---

## Deploy (about 5 minutes)

**1.** Sign in at [vercel.com](https://vercel.com) with **Continue with GitHub**.

**2.** **Add New → Project** → import `triad-thread-studio`. Vercel detects
Next.js on its own; change nothing.

**3.** Before clicking Deploy, add these under **Environment Variables**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://triad-thread-studio.vercel.app` |
| `AUTH_SECRET` | generate it — see below |

Generate the secret locally and paste the output:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**4.** Deploy.

The marketing site, the 3D studio and both configurators work immediately.
Quote submission and admin need a database — step 5.

---

## Add the database

Free Postgres from [supabase.com](https://supabase.com). Create a project, then
**Project Settings → Database → Connection string**, and add both to Vercel:

| Name | Which string | Why |
|---|---|---|
| `DATABASE_URL` | **Pooled**, port 6543, ends `?pgbouncer=true` | Serverless opens and drops connections constantly; without the pooler Postgres runs out |
| `DIRECT_URL` | **Direct**, port 5432 | PgBouncer cannot run migrations |

Then from your machine, with the same two values in `.env`:

```bash
npm run db:push
```

```bash
npm run db:seed
```

Redeploy on Vercel (**Deployments → ⋯ → Redeploy**) so it picks up the new
variables.

---

## Create your admin login

With `.env` pointing at the live database:

```bash
npm run admin:create
```

It reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`. Minimum 12 characters.
**Delete `ADMIN_PASSWORD` from the file afterwards** — it is not needed again.

Sign in at `https://your-domain/admin/login`.

Repeat with each owner's email so every one of the three has their own login.
A shared password means the audit trail cannot tell you who cancelled an order.

---

## Email (optional, do it before taking real enquiries)

Without this, quote requests are still **saved to the database and visible in
admin** — only the notification email is skipped. Nothing is lost.

[resend.com](https://resend.com) → API key → add to Vercel:

- `RESEND_API_KEY`
- `EMAIL_FROM` — must be on a domain verified in Resend, not a Gmail address
- `EMAIL_TO_INTERNAL` — where enquiries land

---

## Custom domain

Vercel → **Settings → Domains** → add it, then point the DNS records it shows
you. Update `NEXT_PUBLIC_SITE_URL` to the new domain and redeploy, or canonical
URLs and structured data will keep pointing at the vercel.app address.

---

## Before you announce it

```bash
npm run check:placeholders
```

Currently outstanding:

- Workshop address — a trade buyer checks this before committing to a run
- `standardLeadTimeDays` and `bulkLeadTimeDays` — these are quoted to customers
- Instagram and Facebook URLs — slots exist in `src/config/site.ts` and feed
  the `sameAs` structured data Google uses to link a business to its profiles
