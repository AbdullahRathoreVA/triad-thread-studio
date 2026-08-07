import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hit, clientIp } from "@/lib/rate-limit";
import {
  visitorHash,
  classifyDevice,
  classifyBrowser,
  classifyOs,
  referrerHost,
  normalisePath,
} from "@/lib/analytics";

export const runtime = "nodejs";

/**
 * Page-view collection.
 *
 * Always answers 204 — success, failure, rate-limited or malformed. A tracking
 * beacon must never surface an error to a visitor or block a page, and an
 * endpoint that reports "rejected" tells a scraper how to tune its payload.
 * Problems are logged server-side instead.
 */
export async function POST(request: Request) {
  const noContent = new NextResponse(null, { status: 204 });

  try {
    const ip = clientIp(request.headers);

    // 120 views/hour per address. A real person browsing hard will not reach
    // it; a script trying to inflate the numbers will.
    if (!hit(`track:${ip}`, 120, 60 * 60 * 1000).ok) return noContent;

    const body = (await request.json().catch(() => null)) as
      | { path?: string; referrer?: string | null }
      | null;
    if (!body) return noContent;

    const path = normalisePath(String(body.path ?? ""));
    if (!path) return noContent;

    const userAgent = request.headers.get("user-agent") ?? "";
    const device = classifyDevice(userAgent);

    // Bots are recorded but never counted as people — see the insights page,
    // which excludes them from every visitor figure.
    const salt = process.env.AUTH_SECRET ?? "analytics-fallback-salt";
    const selfHost = new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ).hostname;

    await db.pageView.create({
      data: {
        path,
        referrerHost: referrerHost(body.referrer ?? null, selfHost),
        device,
        browser: classifyBrowser(userAgent),
        os: classifyOs(userAgent),
        // Vercel resolves this at the edge; absent locally.
        country: request.headers.get("x-vercel-ip-country") ?? null,
        visitorHash: visitorHash(ip, userAgent, salt),
      },
    });
  } catch (error) {
    console.error("[track] failed", error);
  }

  return noContent;
}
