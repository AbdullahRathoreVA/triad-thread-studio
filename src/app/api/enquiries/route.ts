import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enquirySchema } from "@/lib/validation/order";
import { hit, clientIp } from "@/lib/rate-limit";
import { sendEnquiryNotification } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Public enquiry intake — contact form and wholesale requests.
 *
 * For a manufacturer this is the highest-value endpoint on the site: a bulk
 * enquiry is worth more than a single jacket order. So it fails loudly to the
 * operator (persisted, then emailed) and gently to the customer.
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers);

  // Looser than the order endpoint — a genuine buyer may legitimately send a
  // couple of enquiries, and blocking a wholesale lead is expensive.
  const limit = hit(`enquiry:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many messages from this address. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = enquirySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Some details need correcting.",
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }

  const input = parsed.data;

  // Honeypot: mimic success exactly so a bot cannot detect the trap.
  if (input.website) {
    return NextResponse.json({ ok: true });
  }

  try {
    // Persist first. If the mail provider is down, the lead is still captured
    // and visible in admin — losing a wholesale enquiry to an SMTP blip would
    // be the single most expensive failure this endpoint could have.
    const enquiry = await db.enquiry.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        subject: input.subject,
        message: input.message,
        quantity: input.quantity,
        type: input.type,
      },
    });

    try {
      await sendEnquiryNotification({
        name: input.name,
        email: input.email,
        company: input.company,
        message: input.message,
        quantity: input.quantity,
        type: input.type,
      });
    } catch (error) {
      console.error("[enquiries] notification email failed", {
        enquiryId: enquiry.id,
        error,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[enquiries] failed", error);
    return NextResponse.json(
      { error: "We could not send that message. Please try again." },
      { status: 500 },
    );
  }
}
