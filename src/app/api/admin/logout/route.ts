import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { site } from "@/config/site";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await clearSessionCookie();

  // Same-origin check: without it, any site could POST here and force a logout.
  // Harmless on its own, but it is a CSRF hole and costs one line to close.
  const origin = request.headers.get("origin");
  const expected = new URL(site.url).origin;
  if (origin && origin !== expected) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.redirect(new URL("/admin/login", request.url), {
    status: 303,
  });
}
