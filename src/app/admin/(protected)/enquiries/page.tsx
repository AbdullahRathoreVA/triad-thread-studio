import Link from "next/link";
import { EnquiryStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { PageHeading, EmptyState, DatabaseDown } from "@/components/admin/ui";
import { EnquiryCard } from "./enquiry-card";

export const dynamic = "force-dynamic";

type Search = Promise<{ status?: string }>;

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const params = await searchParams;

  const status =
    params.status && params.status in EnquiryStatus
      ? (params.status as EnquiryStatus)
      : undefined;

  const where: Prisma.EnquiryWhereInput = status ? { status } : {};

  let data;
  try {
    const [enquiries, counts] = await Promise.all([
      db.enquiry.findMany({
        where,
        // NEW first regardless of age: an unanswered wholesale lead from
        // yesterday matters more than a closed one from an hour ago.
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 100,
      }),
      db.enquiry.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    data = { enquiries, counts };
  } catch (error) {
    console.error("[admin/enquiries] database unavailable", error);
    return (
      <>
        <PageHeading title="Enquiries" />
        <DatabaseDown />
      </>
    );
  }

  const countFor = (s: EnquiryStatus) =>
    data.counts.find((c) => c.status === s)?._count._all ?? 0;

  const newCount = countFor("NEW");

  return (
    <>
      <PageHeading
        title="Enquiries"
        subtitle={
          newCount > 0
            ? `${newCount} awaiting a reply`
            : "Everything here has been triaged"
        }
      />

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/admin/enquiries"
          className={cn(
            "rounded-xs border px-3 py-1.5 text-[0.72rem] transition-colors",
            !status
              ? "border-gold-300/50 bg-gold-300/8 text-ink-50"
              : "border-hairline text-ink-400 hover:text-ink-100",
          )}
        >
          All
        </Link>
        {Object.values(EnquiryStatus).map((s) => (
          <Link
            key={s}
            href={`/admin/enquiries?status=${s}`}
            className={cn(
              "rounded-xs border px-3 py-1.5 text-[0.72rem] transition-colors",
              status === s
                ? "border-gold-300/50 bg-gold-300/8 text-ink-50"
                : "border-hairline text-ink-400 hover:text-ink-100",
            )}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
            <span className="ml-1.5 tabular-nums text-ink-600">{countFor(s)}</span>
          </Link>
        ))}
      </div>

      {data.enquiries.length === 0 ? (
        <EmptyState
          title={status ? "Nothing in this state" : "No enquiries yet"}
          body={
            status
              ? "Try a different filter."
              : "Messages from the contact and wholesale forms arrive here, and are saved even if the notification email fails."
          }
        />
      ) : (
        <div className="space-y-4">
          {data.enquiries.map((enquiry) => (
            <EnquiryCard
              key={enquiry.id}
              enquiry={{
                ...enquiry,
                createdAt: enquiry.createdAt.toISOString(),
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
