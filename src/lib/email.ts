import { Resend } from "resend";
import { site, PLACEHOLDER } from "@/config/site";
import { formatPrice } from "@/lib/utils";

/**
 * Transactional email via Resend.
 *
 * Every send is a no-op that logs loudly when RESEND_API_KEY is unset, so local
 * development and preview deploys never fail on a missing key — and never
 * silently pretend an email went out either.
 */

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM ?? "Triad Thread Studio <onboarding@resend.dev>";

/** Escape anything interpolated into an HTML email body. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(heading: string, body: string): string {
  // Table layout and inline styles: email clients have no flexbox and no <style>.
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0a0a0a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#131313;border:1px solid #2a2825;border-radius:4px;">
<tr><td style="padding:36px 36px 0;">
<p style="margin:0;font-family:Georgia,serif;font-size:12px;letter-spacing:4px;color:#b79976;text-transform:uppercase;">Triad Thread Studio</p>
<h1 style="margin:20px 0 0;font-family:Georgia,serif;font-weight:300;font-size:28px;line-height:1.2;color:#f2eee7;">${esc(heading)}</h1>
</td></tr>
<tr><td style="padding:24px 36px 36px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.75;color:#b5aca0;">
${body}
</td></tr>
<tr><td style="padding:20px 36px;border-top:1px solid #2a2825;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#5c5751;">
${esc(site.name)}${site.contact.email !== PLACEHOLDER ? ` · ${esc(site.contact.email)}` : ""}
</td></tr>
</table></td></tr></table></body></html>`;
}

function row(label: string, value: string): string {
  return `<tr>
<td style="padding:7px 0;color:#8a8378;font-size:13px;">${esc(label)}</td>
<td style="padding:7px 0;text-align:right;color:#f2eee7;font-size:13px;">${esc(value)}</td>
</tr>`;
}

export async function sendOrderConfirmation({
  to,
  orderNumber,
  totalCents,
  leadTimeDays,
  estimatedShipAt,
  designCode,
}: {
  to: string;
  orderNumber: string;
  totalCents: number;
  leadTimeDays: number;
  estimatedShipAt: Date | null;
  designCode: string;
}) {
  const shipDate = estimatedShipAt
    ? estimatedShipAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : `${leadTimeDays} working days from today`;

  const html = shell(
    "Your order is confirmed",
    `<p style="margin:0 0 22px;">Thank you — we have your specification and production is scheduled.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2a2825;border-bottom:1px solid #2a2825;margin:0 0 22px;">
${row("Order number", orderNumber)}
${row("Design reference", designCode)}
${row("Total", formatPrice(totalCents))}
${row("Estimated dispatch", shipDate)}
</table>
<p style="margin:0 0 8px;">We will email you again when your piece enters production, and once more when it ships.</p>
<p style="margin:0;color:#5c5751;font-size:12px;">Quote your order number in any correspondence.</p>`,
  );

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY unset — confirmation for ${orderNumber} was NOT sent to ${to}.`,
    );
    return { skipped: true as const };
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Order ${orderNumber} confirmed — ${site.name}`,
    html,
  });

  if (error) throw new Error(`Resend refused the message: ${error.message}`);
  return { skipped: false as const };
}

export async function sendEnquiryNotification({
  name,
  email,
  company,
  message,
  quantity,
  type,
}: {
  name: string;
  email: string;
  company?: string;
  message: string;
  quantity?: number;
  type: string;
}) {
  const to = process.env.EMAIL_TO_INTERNAL;

  if (!resend || !to) {
    console.warn("[email] enquiry notification skipped — RESEND_API_KEY or EMAIL_TO_INTERNAL unset.");
    return { skipped: true as const };
  }

  const html = shell(
    `New ${type.toLowerCase()} enquiry`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #2a2825;margin:0 0 20px;">
${row("From", name)}
${row("Email", email)}
${company ? row("Company", company) : ""}
${quantity ? row("Quantity", String(quantity)) : ""}
</table>
<p style="margin:0;white-space:pre-wrap;">${esc(message)}</p>`,
  );

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    replyTo: email,
    subject: `${type} enquiry from ${name}`,
    html,
  });

  if (error) throw new Error(`Resend refused the message: ${error.message}`);
  return { skipped: false as const };
}
