# Security

## Controls in place

### Pricing integrity
The highest-value attack on this platform is ordering a $600 jacket for $1.

`POST /api/orders` **recomputes the entire price server-side** with the same
pure function the browser used, loading coupons live from the database. The
client's `expectedTotalCents` is compared, never trusted — a mismatch returns
409 and nothing is written. Coupon redemption limits are enforced at query
time; the engine itself stays pure and knows nothing about them.

All money is integer cents end to end. There is no float in the pricing path,
and a test asserts it.

### Input validation
Every request body is parsed with Zod before touching business logic
(`lib/validation/order.ts`). Option ids validate against enums **generated from
the configurator config itself**, so a client cannot invent a free leather or
smuggle markup through a select. Personalisation text is restricted by Unicode
property escape to letters, numbers and basic punctuation — it ends up in an
email, a PDF and an admin table.

### Authentication
- bcrypt, 12 rounds.
- Stateless HS256 JWT in an `httpOnly`, `secure`, `sameSite=lax` cookie.
- `tokenVersion` embedded in the claim and re-checked on every privileged read
  — bumping the column revokes every outstanding session instantly.
- **Timing-safe failure**: a login for a non-existent account still runs a
  bcrypt comparison against a dummy hash, so response timing does not reveal
  which addresses have accounts.
- One generic error for unknown email, wrong password and deactivated account.
- Rate limit: 5 attempts / 15 min / IP.

### Authorisation boundary
Middleware verifies the JWT signature only — Prisma cannot run on the Edge.
**The real boundary is `app/admin/(protected)/layout.tsx`**, which re-reads the
account and rejects deactivated users and stale token versions. Middleware is a
fast redirect for the common case, never the gate on its own.

### Headers (middleware.ts)
CSP, `X-Frame-Options: DENY`, `nosniff`, `strict-origin-when-cross-origin`,
a `Permissions-Policy` denying camera/mic/geolocation, and HSTS with preload in
production. Admin routes additionally send `no-store`.

### Other
- **Open redirect**: post-login `next` must start with `/` and not `//`.
- **CSRF**: `sameSite=lax` cookies; logout additionally checks `Origin`.
- **XSS**: React escapes by default; JSON-LD escapes `<` before injection;
  HTML emails escape every interpolated value.
- **SQL injection**: Prisma parameterises everything. No raw SQL anywhere.
- **Error disclosure**: handlers log detail server-side and return generic
  messages. No stack traces reach a client.
- **Honeypot** on the order endpoint, returning a fake success so bots learn
  nothing.

---

## Known limitations

**Rate limiting is per-instance and in-memory.** On serverless, the effective
ceiling is `limit × running instances`, and counters reset on cold start. It
stops a single script hammering an endpoint; it will not stop a distributed
attack. Swap `lib/rate-limit.ts`'s `hit()` for Upstash Redis if that becomes
real — call sites do not change.

**CSP allows `'unsafe-inline'` for scripts and styles.** Framer Motion and
React Three Fiber both write inline styles, and Next's bootstrap uses inline
script. Tightening this needs nonce-based CSP, which conflicts with static
prerendering. Documented rather than silently ignored.

**No payment processing.** Orders are captured as commitments; no card data is
touched anywhere, which is deliberate — it keeps the platform entirely out of
PCI scope. Add a hosted checkout (Stripe Checkout, Paddle) rather than
collecting card details directly.

**No 2FA on admin.** Worth adding before the account controls real revenue.

**Audit log is write-only.** `AuditLog` records logins; extend it to cover
price and product mutations before multiple staff have access.

---

## Reporting

Email the address in `src/config/site.ts` once it is set. Please do not open a
public issue for a vulnerability.
