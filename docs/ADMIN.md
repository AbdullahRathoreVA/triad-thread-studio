# The admin area

## Where it is

```
https://yourdomain.com/admin
```

Locally that is `http://localhost:3000/admin`.

Visiting it while signed out redirects to `/admin/login`.

---

## Can customers find it?

No. Four separate things keep it out of sight:

| | |
|---|---|
| **Not linked anywhere** | No nav item, no footer link, no sitemap entry. Nothing on the public site points at `/admin`. |
| **Blocked in robots.txt** | `Disallow: /admin` and `Disallow: /api/` — search engines will not crawl it. |
| **`noindex` on the login page** | Even if the URL leaks, Google will not list it. |
| **Every route is gated** | Middleware redirects signed-out visitors, and the layout re-checks against the database on every request. |

A customer will never stumble on it. Someone who *guesses* the URL sees a login
form and nothing else — no order data, no customer names, no hint that a
particular email address has an account.

---

## Creating your login

You need the database running first (see [DEPLOYMENT.md](DEPLOYMENT.md)).

**1.** Put your details in `.env`:

```
ADMIN_EMAIL="bilalatique050@gmail.com"
ADMIN_PASSWORD="pick-something-long-and-unguessable"
```

**2.** Run:

```bash
npm run admin:create
```

**3.** Delete `ADMIN_PASSWORD` from `.env`. It is not needed again, and a
plaintext password sitting in a file is the easiest thing in this project to
leak.

**4.** Sign in at `/admin/login`.

### Adding the other owners

Same command, different email. Each owner should have their own login — a
shared password means the audit trail cannot tell you who cancelled an order.

### Forgotten password

Re-run the same command with a new `ADMIN_PASSWORD`. That resets it **and**
signs out every existing session for that account.

---

## Password rules

Minimum 12 characters, enforced by the script. That is not bureaucracy: this
login can read every customer's home address and change every price on the
site. Use a passphrase you do not use anywhere else.

Passwords are stored as bcrypt hashes at 12 rounds. Nobody — including
whoever runs the server — can read them back.

---

## What you can do in there

**Overview** — order count, orders awaiting action, booked revenue, new enquiries.

**Orders** — filter by status, search by order number, customer name or email.
Open one to see the full cutting specification: every option resolved to a
readable label, measurements, personalisation text, customer instructions and
reference image. This is the page you work from.

Status moves along a fixed path:

```
Pending → Confirmed → In production → Quality check → Shipped → Delivered
```

Cancel is available until production; refund only after delivery. You cannot
move an order backwards by accident, and cancelling or refunding asks for a
second click. Every change is logged with who did it and when.

**Enquiries** — contact and wholesale messages, newest unanswered first.
Mark them New / Read / Replied / Closed, and reply straight to the sender.

Products, collections, coupons and content are listed in the sidebar as
"Coming next" — they are not built yet, and are shown greyed rather than as
links so you can tell "not built" from "broken".

---

## Security notes

- Sessions last 8 hours, then you sign in again.
- Five failed sign-ins from one address locks that address out for 15 minutes.
- A wrong email and a wrong password give the identical error and take the
  identical time to respond, so nobody can discover which addresses have
  accounts.
- Admin pages are never cached by browsers or proxies.

If you ever think a login is compromised: re-run `npm run admin:create` with a
new password. Every session on that account dies immediately.
