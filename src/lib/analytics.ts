import { createHash } from "node:crypto";

/**
 * First-party analytics helpers.
 *
 * Deliberately cookie-free and third-party-free. Nothing is sent to Google or
 * anyone else, so there is no consent banner to show and no data leaving the
 * business.
 *
 * ─── On not storing IP addresses ─────────────────────────────────────────
 * A raw IP is personal data in most jurisdictions, and storing one buys
 * nothing here: the only question the business actually asks is "how many
 * different people, and on what device". `visitorHash` answers that from a
 * one-way SHA-256 of IP + user-agent + a salt that includes the calendar day.
 *
 * Because the salt rotates daily the same person hashes differently tomorrow,
 * so nobody can be followed across days, and the hash cannot be reversed to an
 * IP. Unique-visitors-per-day stays accurate; surveillance does not become
 * possible.
 * ─────────────────────────────────────────────────────────────────────────
 */

export function visitorHash(ip: string, userAgent: string, salt: string): string {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return createHash("sha256")
    .update(`${ip}|${userAgent}|${day}|${salt}`)
    .digest("hex")
    .slice(0, 32);
}

export type DeviceKind = "mobile" | "tablet" | "desktop" | "bot";

/**
 * Device classification from the user-agent.
 *
 * Bots are detected and labelled rather than dropped, so the operator can see
 * how much of their traffic is crawlers instead of silently inflating
 * "visitors" with Googlebot.
 */
export function classifyDevice(ua: string): DeviceKind {
  const s = ua.toLowerCase();

  if (
    /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|headless|lighthouse|pagespeed|curl|wget|python-requests|axios/.test(
      s,
    )
  ) {
    return "bot";
  }

  // Order matters: many tablets also contain "mobile" or "android".
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/.test(s)) {
    return "mobile";
  }
  return "desktop";
}

export function classifyBrowser(ua: string): string {
  const s = ua.toLowerCase();
  // Checked most-specific first: Edge and Opera both claim to be Chrome,
  // and Chrome claims to be Safari.
  if (s.includes("edg/")) return "Edge";
  if (s.includes("opr/") || s.includes("opera")) return "Opera";
  if (s.includes("samsungbrowser")) return "Samsung Internet";
  if (s.includes("firefox")) return "Firefox";
  if (s.includes("chrome") || s.includes("crios")) return "Chrome";
  if (s.includes("safari")) return "Safari";
  return "Other";
}

export function classifyOs(ua: string): string {
  const s = ua.toLowerCase();
  if (s.includes("windows")) return "Windows";
  if (/iphone|ipad|ipod/.test(s)) return "iOS";
  if (s.includes("mac os")) return "macOS";
  if (s.includes("android")) return "Android";
  if (s.includes("linux")) return "Linux";
  return "Other";
}

/** Referrer reduced to a bare host, so no query strings or paths are stored. */
export function referrerHost(referrer: string | null, selfHost: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    // Internal navigation is not a referral.
    return host === selfHost.replace(/^www\./, "") ? null : host;
  } catch {
    return null;
  }
}

/** Keep only paths the app actually serves, so the table cannot be polluted. */
export function normalisePath(path: string): string | null {
  if (!path.startsWith("/") || path.length > 120) return null;
  // Strip query and hash — they carry no analytic value here and can carry PII.
  const clean = path.split(/[?#]/)[0];
  return clean.length > 1 ? clean.replace(/\/+$/, "") : "/";
}
