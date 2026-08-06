import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { site, PLACEHOLDER } from "@/config/site";

/**
 * Shared shell for policy pages.
 *
 * The review banner is not decoration. These documents were drafted from
 * common practice, not by a lawyer, and the jurisdiction is unknown while the
 * business address is still a placeholder — so the notice renders until real
 * contact details are configured, then disappears on its own. That ties the
 * warning to the same launch gate as everything else rather than relying on
 * someone remembering to delete it.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const unreviewed = site.contact.email === PLACEHOLDER;

  return (
    <>
      <Nav />
      <main id="main" className="pt-[74px]">
        <div className="container-luxe max-w-3xl py-20 md:py-28">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-6 font-display text-4xl text-ink-50 md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-[0.75rem] text-ink-500">Last updated {updated}</p>

          {unreviewed && (
            <div
              role="note"
              className="mt-9 rounded-xs border border-gold-300/35 bg-gold-300/6 p-5"
            >
              <p className="text-[0.78rem] leading-relaxed text-gold-100">
                <strong className="font-medium">Draft — pending legal review.</strong>{" "}
                This document was prepared from common practice, not by a
                qualified lawyer, and the governing jurisdiction has not yet been
                set. Have it reviewed before trading. This notice disappears once
                the business details in{" "}
                <code className="text-gold-200">src/config/site.ts</code> are
                filled in.
              </p>
            </div>
          )}

          <div className="mt-14 space-y-10">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export function Clause({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-2xl text-ink-50">{heading}</h2>
      <div className="mt-4 space-y-4 text-[0.88rem] leading-[1.9] text-ink-300">
        {children}
      </div>
    </section>
  );
}
