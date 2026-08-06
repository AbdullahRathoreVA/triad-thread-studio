import { NextResponse, type NextRequest } from "next/server";
// Import from @/lib/session, NOT @/lib/auth. The latter pulls in Prisma and
// bcrypt, which are Node-only and crash the Edge runtime at request time with
// "Native module not found: node:util/types".
import { readToken, SESSION_COOKIE } from "@/lib/session";

/**
 * Edge middleware: security headers on every response, plus a cheap gate on
 * /admin.
 *
 * The gate here only proves the JWT signature — it deliberately does NOT hit
 * the database, because middleware runs on every request and Prisma cannot run
 * on the Edge runtime anyway. The authoritative check (account still active,
 * tokenVersion still current) happens in the admin layout via `requireAdmin()`.
 * Treat this as a fast redirect for the common case, never as the security
 * boundary on its own.
 */

const isProd = process.env.NODE_ENV === "production";

/**
 * Content Security Policy.
 *
 * `'unsafe-inline'` on style-src is required: Framer Motion and React Three
 * Fiber both write inline styles for transforms, and there is no nonce path
 * for runtime-generated style attributes.
 *
 * In development `'unsafe-eval'` is additionally required by Turbopack's HMR.
 * It is dropped in production.
 */
function contentSecurityPolicy(): string {
  const scriptSrc = isProd
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    // blob: and data: cover the procedurally generated canvas textures.
    "img-src 'self' data: blob: https://res.cloudinary.com",
    "media-src 'self' https://res.cloudinary.com",
    "connect-src 'self' https://api.resend.com https://api.cloudinary.com" +
      (isProd ? "" : " ws: http://localhost:*"),
    "worker-src 'self' blob:",
    "frame-ancestors 'none'", // Clickjacking: this site is never framed.
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": contentSecurityPolicy(),
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // No feature on this site needs these.
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "X-DNS-Prefetch-Control": "on",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---- Admin gate ---------------------------------------------------------
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const claims = token ? await readToken(token) : null;

    if (!claims) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      // Bring them back where they were trying to go, but only ever to an
      // internal path — an open redirect here would be a phishing gift.
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();

  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }

  if (isProd) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  // Admin pages must never be cached by a shared proxy.
  if (pathname.startsWith("/admin")) {
    response.headers.set("Cache-Control", "no-store, must-revalidate");
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, which need no headers and would only
    // add per-request overhead.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?)$).*)",
  ],
};
