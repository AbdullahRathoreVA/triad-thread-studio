# Roadmap

What exists, what does not, and the order I would build the rest in.

---

## Built and verified

- Design system derived from the real logo palette
- Cinematic 3D hero (procedural leather, local light rig, particles) with
  static fallback for reduced-motion, no-WebGL and low-power devices
- Homepage: hero, positioning, four-stage process, custom-studio CTA
- Navigation with mega-panel, mobile drawer, scroll states
- Custom jacket configurator — 26 option groups, live 3D preview, live pricing
- Price engine: leather multipliers, add-ons, per-character personalisation,
  bulk tiers, coupons, shipping thresholds, tax, lead-time accumulation
  (19 tests)
- `POST /api/orders` with authoritative server-side re-pricing
- Prisma schema: 18 models covering catalogue, orders, CMS, auth, audit
- Admin login, session, protected route group, overview dashboard
- Security headers, CSP, rate limiting, Zod validation
- SEO: metadata API, Organization/Product/Breadcrumb/FAQ JSON-LD, sitemap,
  robots
- Docs, seed script, launch gate

---

## Next, in order

### 1. Checkout form — highest value
The engine and the API both exist and are tested; there is no UI that posts to
them. A customer can design a jacket and see a price but cannot yet order.

Needs: customer + shipping fields (react-hook-form + the existing Zod schema),
a review step showing the breakdown, `POST /api/orders`, and a confirmation
page. Handle the 409 `PRICE_MISMATCH` explicitly — show the new total and ask
the customer to confirm rather than silently re-charging.

### 2. Catalogue pages
`/collections`, `/collections/[slug]`, `/products/[slug]`. Schema, JSON-LD
emitters and sitemap wiring are already in place and expect these routes.
Blocked on real products and photography.

### 3. Admin CRUD
Overview exists; the remaining nav entries are stubs. Order detail with status
transitions first — that is the screen the business actually runs on daily.
Then products, collections, coupons, enquiries, content.

### 4. Remaining public pages
`/craft`, `/bulk`, `/contact` (wire `enquirySchema` and
`sendEnquiryNotification` — both already written), `/privacy`, `/terms`.

### 5. Product 360° viewer
`ProductImage.is360` exists in the schema. Straightforward frame-sequence
viewer once turntable shots exist.

---

## Deferred deliberately

**A photoreal 3D jacket.** The configurator's jacket is built from extruded
pattern pieces — clearly a jacket, correctly materialled, freely rotatable, but
stylised. Photorealism needs a sculpted, UV-unwrapped, cloth-simulated GLTF,
which is a 3D-artist deliverable. Faking it in code produces the
melted-mannequin look that reads as cheap immediately.

`JacketModel`'s props are exactly what a GLTF replacement would need, so the
swap touches one file.

**Payments.** See [SECURITY.md](SECURITY.md) — staying out of PCI scope is
deliberate. Add hosted checkout when needed.

**Blog/journal.** `Post` model exists; no routes. Low priority until there is
traffic to serve.

---

## Before launch

- [ ] `npm run check:placeholders` passes
- [ ] Real product photography (see [ASSETS.md](ASSETS.md))
- [ ] Real lead times in `site.production` — these are quoted to customers
- [ ] OG image at `public/og/default.png` (1200×630)
- [ ] `favicon.ico` from the logo mark
- [ ] Legal pages reviewed by someone qualified
- [ ] Lighthouse run on the deployed build, not locally
- [ ] Delete `ADMIN_PASSWORD` from the environment after seeding
