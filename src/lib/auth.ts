import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSession,
  readToken,
  type SessionClaims,
} from "@/lib/session";

/**
 * Node-runtime admin authentication.
 *
 * Anything here touches bcrypt, Prisma or next/headers, so this module must
 * NEVER be imported from middleware — see the note in @/lib/session, which
 * holds the Edge-safe half.
 *
 * Sessions are stateless JWTs in an httpOnly cookie. `tokenVersion` is embedded
 * in the claim and re-checked against the database on every privileged read,
 * which gives stateless tokens a working revocation story: bump the column and
 * every outstanding session for that user dies immediately.
 */

export { SESSION_COOKIE, createSession, readToken };
export type { SessionClaims };

export async function hashPassword(plain: string): Promise<string> {
  // 12 rounds: ~250ms on typical hardware. Slow enough to make offline
  // cracking expensive, fast enough not to time out a serverless login.
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true, // Unreadable from JS, so XSS cannot exfiltrate it.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // Blocks CSRF on cross-site POSTs while keeping links working.
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Full session check for server components and route handlers.
 * Re-reads the user so a deactivated account or bumped tokenVersion takes
 * effect on the very next request rather than at token expiry.
 */
export async function getCurrentAdmin() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const claims = await readToken(token);
  if (!claims) return null;

  const user = await db.adminUser.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      tokenVersion: true,
    },
  });

  if (!user || !user.active || user.tokenVersion !== claims.tv) return null;
  return user;
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("UNAUTHORISED");
  return admin;
}
