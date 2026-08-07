import Link from "next/link";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { PageHeading, DatabaseDown, EmptyState } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type Search = Promise<{ days?: string }>;

const RANGES = [7, 30, 90] as const;

/** A horizontal bar row — readable at a glance without a charting library. */
function Bar({
  label,
  value,
  max,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-4 text-[0.78rem]">
        <span className="truncate text-ink-200">{label}</span>
        <span className="shrink-0 tabular-nums text-ink-400">
          {value.toLocaleString()}
          {suffix}
        </span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-ink-800">
        <div
          className="h-full rounded-full bg-gold-300/70"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border-t border-hairline pr-6 pt-5">
      <p className="text-[0.7rem] text-ink-500">{label}</p>
      <p className="mt-2 font-display text-3xl tabular-nums text-ink-50">{value}</p>
      {hint && <p className="mt-1 text-[0.66rem] text-ink-600">{hint}</p>}
    </div>
  );
}

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-hairline bg-ink-900 p-6">
      <h2 className="font-roman text-[0.62rem] uppercase tracking-[0.2em] text-gold-300">
        {title}
      </h2>
      {note && <p className="mt-2 text-[0.68rem] text-ink-600">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const params = await searchParams;
  const days = RANGES.includes(Number(params.days) as 7)
    ? Number(params.days)
    : 30;

  const since = new Date();
  since.setDate(since.getDate() - days);

  let data;
  try {
    // Bots are excluded from every human-facing figure. Counting Googlebot as
    // a visitor is the single easiest way to make traffic numbers a lie.
    const humans = { createdAt: { gte: since }, device: { not: "bot" } };

    const [
      views,
      uniqueRows,
      deviceRows,
      browserRows,
      osRows,
      pathRows,
      referrerRows,
      countryRows,
      botCount,
      enquiries,
      orders,
      recentLeads,
    ] = await Promise.all([
      db.pageView.count({ where: humans }),
      db.pageView.findMany({
        where: humans,
        select: { visitorHash: true },
        distinct: ["visitorHash"],
      }),
      db.pageView.groupBy({
        by: ["device"],
        where: humans,
        _count: { _all: true },
      }),
      db.pageView.groupBy({
        by: ["browser"],
        where: humans,
        _count: { _all: true },
      }),
      db.pageView.groupBy({ by: ["os"], where: humans, _count: { _all: true } }),
      db.pageView.groupBy({
        by: ["path"],
        where: humans,
        _count: { _all: true },
        orderBy: { _count: { path: "desc" } },
        take: 10,
      }),
      db.pageView.groupBy({
        by: ["referrerHost"],
        where: { ...humans, referrerHost: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { referrerHost: "desc" } },
        take: 8,
      }),
      db.pageView.groupBy({
        by: ["country"],
        where: { ...humans, country: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { country: "desc" } },
        take: 8,
      }),
      db.pageView.count({
        where: { createdAt: { gte: since }, device: "bot" },
      }),
      db.enquiry.count({ where: { createdAt: { gte: since } } }),
      db.order.count({ where: { createdAt: { gte: since } } }),
      // The only real contact details that exist — people who chose to give them.
      db.enquiry.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
          type: true,
          quantity: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    data = {
      views,
      uniques: uniqueRows.length,
      deviceRows,
      browserRows,
      osRows,
      pathRows,
      referrerRows,
      countryRows,
      botCount,
      enquiries,
      orders,
      recentLeads,
    };
  } catch (error) {
    console.error("[admin/insights] database unavailable", error);
    return (
      <>
        <PageHeading title="Insights" />
        <DatabaseDown />
      </>
    );
  }

  const studioViews =
    data.pathRows.find((p) => p.path === "/customize")?._count._all ?? 0;

  // Visits → studio → enquiry. The only funnel the business can act on.
  const studioRate = data.uniques > 0 ? (studioViews / data.uniques) * 100 : 0;
  const enquiryRate = data.uniques > 0 ? (data.enquiries / data.uniques) * 100 : 0;

  const maxOf = <T,>(rows: T[], get: (r: T) => number) =>
    rows.reduce((m, r) => Math.max(m, get(r)), 0);

  return (
    <>
      <PageHeading
        title="Insights"
        subtitle={`Last ${days} days · first-party, cookie-free`}
      >
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/insights?days=${r}`}
              className={cn(
                "rounded-xs border px-3 py-1.5 text-[0.72rem] transition-colors",
                days === r
                  ? "border-gold-300/50 bg-gold-300/8 text-ink-50"
                  : "border-hairline text-ink-400 hover:text-ink-100",
              )}
            >
              {r}d
            </Link>
          ))}
        </div>
      </PageHeading>

      {data.views === 0 ? (
        <EmptyState
          title="No traffic recorded yet"
          body="Views appear here as soon as people visit the site. Your own visits to /admin are never counted."
        />
      ) : (
        <div className="space-y-8">
          {/* ---- Headline numbers ------------------------------------- */}
          <dl className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Visitors"
              value={data.uniques.toLocaleString()}
              hint="Distinct people, bots excluded"
            />
            <Stat
              label="Page views"
              value={data.views.toLocaleString()}
              hint={`${(data.views / Math.max(data.uniques, 1)).toFixed(1)} pages per visitor`}
            />
            <Stat
              label="Enquiries"
              value={data.enquiries.toLocaleString()}
              hint={`${enquiryRate.toFixed(1)}% of visitors`}
            />
            <Stat
              label="Quote requests"
              value={data.orders.toLocaleString()}
              hint="Full specifications submitted"
            />
          </dl>

          {/* ---- Funnel ------------------------------------------------ */}
          <Panel
            title="Funnel"
            note="Where people drop off between arriving and asking for a price."
          >
            <Bar label="Visited the site" value={data.uniques} max={data.uniques} />
            <Bar
              label="Opened the Custom Studio"
              value={studioViews}
              max={data.uniques}
              suffix={` · ${studioRate.toFixed(0)}%`}
            />
            <Bar
              label="Sent an enquiry"
              value={data.enquiries}
              max={data.uniques}
              suffix={` · ${enquiryRate.toFixed(1)}%`}
            />
            <Bar
              label="Submitted a full quote request"
              value={data.orders}
              max={data.uniques}
            />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Device">
              {data.deviceRows
                .sort((a, b) => b._count._all - a._count._all)
                .map((row) => (
                  <Bar
                    key={row.device}
                    label={row.device[0].toUpperCase() + row.device.slice(1)}
                    value={row._count._all}
                    max={maxOf(data.deviceRows, (r) => r._count._all)}
                  />
                ))}
            </Panel>

            <Panel title="Browser">
              {data.browserRows
                .sort((a, b) => b._count._all - a._count._all)
                .slice(0, 6)
                .map((row) => (
                  <Bar
                    key={row.browser ?? "unknown"}
                    label={row.browser ?? "Unknown"}
                    value={row._count._all}
                    max={maxOf(data.browserRows, (r) => r._count._all)}
                  />
                ))}
            </Panel>

            <Panel title="Operating system">
              {data.osRows
                .sort((a, b) => b._count._all - a._count._all)
                .slice(0, 6)
                .map((row) => (
                  <Bar
                    key={row.os ?? "unknown"}
                    label={row.os ?? "Unknown"}
                    value={row._count._all}
                    max={maxOf(data.osRows, (r) => r._count._all)}
                  />
                ))}
            </Panel>

            <Panel title="Most viewed pages">
              {data.pathRows.map((row) => (
                <Bar
                  key={row.path}
                  label={row.path}
                  value={row._count._all}
                  max={maxOf(data.pathRows, (r) => r._count._all)}
                />
              ))}
            </Panel>

            <Panel
              title="Where visitors came from"
              note="Blank means typed directly or from a private link."
            >
              {data.referrerRows.length === 0 ? (
                <p className="text-[0.78rem] text-ink-500">
                  No external referrers yet.
                </p>
              ) : (
                data.referrerRows.map((row) => (
                  <Bar
                    key={row.referrerHost ?? "direct"}
                    label={row.referrerHost ?? "Direct"}
                    value={row._count._all}
                    max={maxOf(data.referrerRows, (r) => r._count._all)}
                  />
                ))
              )}
            </Panel>

            <Panel title="Country">
              {data.countryRows.length === 0 ? (
                <p className="text-[0.78rem] text-ink-500">
                  Country is resolved once the site is on its own domain.
                </p>
              ) : (
                data.countryRows.map((row) => (
                  <Bar
                    key={row.country ?? "unknown"}
                    label={row.country ?? "Unknown"}
                    value={row._count._all}
                    max={maxOf(data.countryRows, (r) => r._count._all)}
                  />
                ))
              )}
            </Panel>
          </div>

          {/* ---- Leads -------------------------------------------------- */}
          <Panel
            title="Contact details"
            note="Only from people who submitted a form. A website is never told a visitor's phone number — no browser sends one, so anyone offering that is guessing."
          >
            {data.recentLeads.length === 0 ? (
              <p className="text-[0.78rem] text-ink-500">
                No enquiries in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-hairline text-[0.6rem] uppercase tracking-wider text-ink-500">
                      <th scope="col" className="pb-3 pr-4 font-normal">Name</th>
                      <th scope="col" className="pb-3 pr-4 font-normal">Phone</th>
                      <th scope="col" className="pb-3 pr-4 font-normal">Email</th>
                      <th scope="col" className="pb-3 pr-4 font-normal">Company</th>
                      <th scope="col" className="pb-3 pr-4 font-normal">Qty</th>
                      <th scope="col" className="pb-3 font-normal">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentLeads.map((lead) => (
                      <tr key={lead.id} className="border-b border-hairline/60">
                        <td className="py-3 pr-4 text-ink-200">{lead.name}</td>
                        <td className="py-3 pr-4">
                          {lead.phone ? (
                            <a
                              href={`tel:${lead.phone.replace(/\s/g, "")}`}
                              className="text-gold-200 hover:underline"
                            >
                              {lead.phone}
                            </a>
                          ) : (
                            <span className="text-ink-600">not given</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-gold-200 hover:underline"
                          >
                            {lead.email}
                          </a>
                        </td>
                        <td className="py-3 pr-4 text-ink-400">
                          {lead.company ?? "—"}
                        </td>
                        <td className="py-3 pr-4 tabular-nums text-ink-300">
                          {lead.quantity?.toLocaleString() ?? "—"}
                        </td>
                        <td className="py-3 text-[0.72rem] text-ink-400">
                          {lead.type}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <p className="text-[0.7rem] leading-relaxed text-ink-600">
            {data.botCount.toLocaleString()} bot and crawler visits were recorded
            in this period and excluded from every figure above. No cookies are
            set and no data leaves this site — visitors are counted using a
            one-way hash that is re-salted daily, so the same person cannot be
            followed from one day to the next and no IP address is ever stored.
          </p>
        </div>
      )}
    </>
  );
}
