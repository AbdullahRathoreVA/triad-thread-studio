import { SignJWT, jwtVerify } from "jose";

/**
 * Edge-safe session primitives.
 *
 * This module exists SPECIFICALLY so that middleware can verify a token
 * without dragging Prisma and bcrypt into the Edge bundle. Both are Node-only:
 * importing them here fails the whole middleware at runtime with
 * "Native module not found: node:util/types".
 *
 * Keep this file dependency-free apart from `jose`. Anything needing the
 * database, bcrypt, or next/headers belongs in `@/lib/auth` instead.
 */

export const SESSION_COOKIE = "tts_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // One working day.

export type SessionClaims = {
  sub: string;
  email: string;
  role: "OWNER" | "ADMIN" | "EDITOR";
  /** Mirrors AdminUser.tokenVersion, enabling instant revocation. */
  tv: number;
};

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;

  // Failing loudly beats signing tokens with a guessable fallback.
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or shorter than 32 characters. Generate one with: " +
        "node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
    );
  }
  return new TextEncoder().encode(value);
}

export async function createSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .setSubject(claims.sub)
    .sign(secret());
}

export async function readToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionClaims;
  } catch {
    // Expired, tampered, or signed with a rotated secret — all mean "no session".
    return null;
  }
}
