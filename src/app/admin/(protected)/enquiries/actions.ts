"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EnquiryStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";

/**
 * SECURITY: re-checks the session for the same reason as the order actions —
 * a "use server" function is a publicly routable POST endpoint, and the
 * protected layout does not gate it.
 */

const input = z.object({
  id: z.string().min(1).max(64),
  status: z.nativeEnum(EnquiryStatus),
});

export async function setEnquiryStatus(
  raw: z.infer<typeof input>,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not signed in." };

  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  await db.enquiry.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });

  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
  return { ok: true };
}
