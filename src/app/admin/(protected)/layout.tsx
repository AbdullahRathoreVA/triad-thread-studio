import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth";

/**
 * Authoritative admin gate.
 *
 * Middleware only checks the JWT signature (it cannot reach the database from
 * the Edge runtime). THIS is the real boundary: it re-reads the account so a
 * deactivated user or a bumped tokenVersion is rejected immediately.
 *
 * The login page deliberately lives OUTSIDE this route group. Nesting it here
 * and trying to special-case the pathname would create a redirect loop —
 * unauthenticated user hits /admin/login, the layout gates it, and sends them
 * to /admin/login again. A route group makes that structurally impossible.
 */

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/faqs", label: "FAQs" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="flex min-h-screen bg-ink-950">
      <aside className="hidden w-56 shrink-0 border-r border-hairline p-6 lg:block">
        <p className="font-roman text-[0.62rem] tracking-[0.24em] text-gold-300">
          TRIAD ADMIN
        </p>

        <nav aria-label="Admin" className="mt-9">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-xs px-3 py-2 text-[0.8rem] text-ink-300 transition-colors hover:bg-ink-850 hover:text-ink-50"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 border-t border-hairline pt-5">
          <p className="truncate text-[0.72rem] text-ink-300">
            {admin.name ?? admin.email}
          </p>
          <p className="mt-0.5 text-[0.65rem] text-ink-500">{admin.role}</p>
          <form action="/api/admin/logout" method="post" className="mt-3">
            <button
              type="submit"
              className="text-[0.7rem] text-ink-400 transition-colors hover:text-gold-200"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-6 lg:p-10">{children}</main>
    </div>
  );
}
