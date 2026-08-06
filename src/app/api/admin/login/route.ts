import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  verifyPassword,
  createSession,
  setSessionCookie,
  hashPassword,
} from "@/lib/auth";
import { hit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().email().max(200).toLowerCase(),
  password: z.string().min(1).max(200),
  next: z.string().max(200).optional(),
});

/** Cost-matched dummy hash, so a missing account takes the same time as a real one. */
let dummyHash: string | null = null;

export async function POST(request: Request) {
  const ip = clientIp(request.headers);

  // Deliberately strict: 5 attempts per 15 minutes per IP.
  const limit = hit(`admin-login:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await db.adminUser.findUnique({ where: { email } });

  // Always run a bcrypt comparison, even with no matching user. Returning
  // early here would leak which addresses have accounts via response timing.
  dummyHash ??= await hashPassword("timing-equalisation-placeholder");
  const valid = await verifyPassword(password, user?.passwordHash ?? dummyHash);

  if (!user || !user.active || !valid) {
    // One generic message for every failure mode: unknown email, wrong
    // password and deactivated account must be indistinguishable.
    return NextResponse.json(
      { error: "Those credentials were not recognised." },
      { status: 401 },
    );
  }

  const token = await createSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    tv: user.tokenVersion,
  });

  await setSessionCookie(token);

  await Promise.all([
    db.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    db.auditLog.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        action: "admin.login",
        entity: "AdminUser",
        entityId: user.id,
        ip,
      },
    }),
  ]);

  // Only ever redirect to an internal absolute path — never to a caller-supplied
  // host, which would make this an open redirect.
  const next = parsed.data.next;
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

  return NextResponse.json({ ok: true, redirectTo: safeNext });
}
