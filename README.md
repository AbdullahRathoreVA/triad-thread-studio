# Triad Thread Studio

Production website and custom-order platform for a leather goods and sublimated
apparel manufacturer.

Built on Next.js 16, TypeScript, Tailwind 4, React Three Fiber and Prisma 7.
Every dependency is free-tier.

---

## Current state

| Area | Status |
|---|---|
| Design system from measured brand palette | Complete |
| Cinematic 3D hero, homepage | Complete |
| Configurator: leather jackets + sublimated jerseys | Complete |
| Price engine + validation, 50 passing tests | Complete |
| Order API with server-side price re-validation | Complete |
| Checkout flow (review, form, confirmation) | Complete |
| Database schema (18 models) | Complete |
| Admin: auth, overview, orders, order detail, enquiries | Complete |
| Security headers, CSP, rate limiting | Complete |
| SEO: metadata, JSON-LD, sitemap, robots | Complete |
| Admin: products, collections, coupons, content CRUD | **Not built** |
| Public pages: collections, bulk, craft, contact, legal | Complete |
| Product imagery: own 3D renders (no photos supplied) | Complete |

`npm run verify` (typecheck + lint + test) and `npm run build` both pass.

See [docs/ROADMAP.md](docs/ROADMAP.md) for what remains and in what order.

---

## Quick start

```bash
npm install
cp .env.example .env     # then fill it in — see docs/DEPLOYMENT.md
npm run db:push
npm run db:seed
npm run dev
```

Without a database the public site still runs. `/admin` shows setup
instructions rather than an error.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm run verify` | typecheck + lint + test |
| `npm run test` | Pricing, validation and geometry suites (50 tests) |
| `npm run db:push` | Apply schema to the database |
| `npm run db:seed` | Seed collections and FAQs |
| `npm run admin:create` | Create or reset an admin login |
| `npm run db:studio` | Prisma Studio |
| `npm run check:placeholders` | **Launch gate** — fails while business details are unset |

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                  Homepage
│   ├── customize/                Configurator route
│   ├── admin/
│   │   ├── login/                Public — outside the protected group
│   │   └── (protected)/          Route group; layout enforces the session
│   ├── api/orders/               Order intake, authoritative pricing
│   ├── api/admin/                Login / logout
│   ├── sitemap.ts, robots.ts
│   └── globals.css               Design tokens
├── components/
│   ├── layout/                   Nav, footer, cursor, preloader, smooth scroll
│   ├── three/                    Hero scene, leather drape, motes
│   ├── configurator/             Builder, 3D jacket, preview
│   ├── ui/                       Button, reveal primitives
│   └── seo/                      JSON-LD emitters
├── config/
│   ├── site.ts                   Business identity (placeholder-guarded)
│   └── configurator.ts           Every option and price rule, as data
├── lib/
│   ├── pricing/engine.ts         Pure price engine + tests
│   ├── session.ts                Edge-safe JWT primitives
│   ├── auth.ts                   Node-only auth (bcrypt, Prisma)
│   ├── three/leather-texture.ts  Procedural PBR leather generator
│   ├── validation/order.ts       Zod schemas
│   ├── rate-limit.ts, email.ts, db.ts
├── hooks/use-environment.ts      SSR-safe capability hooks
└── middleware.ts                 Security headers + admin gate
```

### Decisions worth knowing

**Pricing is computed twice, deliberately.** The browser runs the engine for
instant feedback; `POST /api/orders` runs the identical pure function and
rejects any mismatch with a 409. The client's number is never persisted.
All money is integer cents — no floats anywhere in the pricing path.

**Leather is generated, not photographed.** `lib/three/leather-texture.ts`
synthesises albedo, normal and roughness maps from Worley noise on a canvas.
Zero licensing risk, ~40KB of code instead of megabytes of PBR textures, and a
distinct material for every leather option at no asset cost.

**Auth is split across two modules.** `lib/session.ts` holds jose-only
primitives and is the only thing middleware may import; `lib/auth.ts` adds
bcrypt and Prisma. Importing the latter from middleware crashes the Edge
runtime — the comment in both files explains why.

**Middleware is not the security boundary.** It checks the JWT signature only,
because Prisma cannot run on the Edge. The authoritative check — account
active, `tokenVersion` current — lives in `app/admin/(protected)/layout.tsx`.

**Unknown business facts are `PLACEHOLDER`, never invented.** A manufacturer's
address, phone number and lead times are trust signals; publishing guessed ones
is worse than publishing none. `npm run check:placeholders` fails while any
remain.

---

## Assets

`public/brand/logo-primary.jpg` is the supplied brand logo. The entire palette
in `globals.css` was derived by pixel-sampling it (`#0A0A0A` at 67% of the
image, `#131313` at 20%, leather `#45271A`–`#664837`, gold `#765839`–`#B79976`).

**No product photography is included.** The images originally supplied were not
photographs of this company's products — one carried a stock-library watermark,
others were retailer product shots of other brands, and all were ≤1280px. They
are not used anywhere. See [docs/ASSETS.md](docs/ASSETS.md).

---

## Documentation

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Supabase, Vercel, Resend, Cloudinary setup
- [docs/SECURITY.md](docs/SECURITY.md) — threat model and controls
- [docs/ASSETS.md](docs/ASSETS.md) — photography requirements
- [docs/ADMIN.md](docs/ADMIN.md) — admin login, access and what it does
- [docs/ROADMAP.md](docs/ROADMAP.md) — what remains
