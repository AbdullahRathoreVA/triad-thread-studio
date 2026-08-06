import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { Reveal, RevealLines } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Leather jackets for men and women, motorcycle and protective outerwear, leather goods and sublimated jerseys — manufactured in-house by Triad Thread Studio.",
  alternates: { canonical: "/collections" },
};

export const revalidate = 300;

type CollectionCard = {
  slug: string;
  title: string;
  subtitle: string | null;
  productCount: number;
};

/**
 * Collections are database-driven, but the page must never 500 because
 * Postgres is briefly unreachable or the catalogue has not been populated
 * yet — a manufacturer's site still has to convert on the Custom Studio.
 */
async function loadCollections(): Promise<CollectionCard[] | null> {
  try {
    const rows = await db.collection.findMany({
      where: { published: true },
      orderBy: { position: "asc" },
      select: {
        slug: true,
        title: true,
        subtitle: true,
        _count: { select: { products: { where: { published: true } } } },
      },
    });
    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      subtitle: r.subtitle,
      productCount: r._count.products,
    }));
  } catch (error) {
    console.error("[collections] database unavailable", error);
    return null;
  }
}

export default async function CollectionsPage() {
  const collections = await loadCollections();
  const hasCollections = collections !== null && collections.length > 0;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", href: "/" },
          { name: "Collections", href: "/collections" },
        ]}
      />
      <Nav />

      <main id="main" className="pt-[74px]">
        <section className="container-luxe py-24 md:py-32">
          <Reveal>
            <p className="eyebrow">Collections</p>
          </Reveal>
          <RevealLines
            as="h1"
            lines={["Built to a spec,", "not to a season."]}
            className="mt-7 font-display text-5xl leading-[1.0] text-ink-50 md:text-6xl"
          />
          <Reveal delay={0.18}>
            <p className="mt-9 max-w-xl text-[0.95rem] leading-[1.85] text-ink-300">
              Every piece below can be reworked — collar, hardware, lining,
              colourway, measurements — or produced in volume under your own
              label.
            </p>
          </Reveal>
        </section>

        {hasCollections ? (
          <section className="border-t border-hairline">
            <ul className="container-luxe grid gap-px md:grid-cols-2">
              {collections.map((collection, i) => (
                <Reveal
                  as="li"
                  key={collection.slug}
                  delay={i * 0.06}
                  className="border-t border-hairline"
                >
                  <Link
                    href={`/collections/${collection.slug}`}
                    className="group block py-12 pr-8 transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-6">
                      <h2 className="font-display text-3xl text-ink-50 transition-colors group-hover:text-gold-200">
                        {collection.title}
                      </h2>
                      <span className="shrink-0 text-gold-300 opacity-0 transition-all duration-500 group-hover:translate-x-1 group-hover:opacity-100">
                        →
                      </span>
                    </div>
                    {collection.subtitle && (
                      <p className="mt-3 max-w-md text-[0.88rem] leading-relaxed text-ink-400">
                        {collection.subtitle}
                      </p>
                    )}
                    <p className="mt-5 font-roman text-[0.6rem] uppercase tracking-[0.22em] text-ink-600">
                      {collection.productCount === 0
                        ? "In production"
                        : `${collection.productCount} ${
                            collection.productCount === 1 ? "piece" : "pieces"
                          }`}
                    </p>
                  </Link>
                </Reveal>
              ))}
            </ul>
          </section>
        ) : (
          /* Honest empty state. Better than a fake grid of placeholder cards —
             and it routes the visitor to the thing that does work. */
          <section className="border-t border-hairline">
            <div className="container-luxe py-24 text-center md:py-32">
              <Reveal>
                <h2 className="mx-auto max-w-lg font-display text-3xl leading-snug text-ink-100 md:text-4xl">
                  The catalogue is being photographed.
                </h2>
                <p className="mx-auto mt-6 max-w-md text-[0.9rem] leading-[1.85] text-ink-400">
                  Ready-to-ship pieces are listed here as each collection is
                  shot. In the meantime the Custom Studio is fully open — design
                  a jacket to your own specification and see the price as you
                  build it.
                </p>
                <div className="mt-11 flex flex-wrap justify-center gap-3">
                  <ButtonLink href="/customize" variant="gold" size="lg">
                    Open the Custom Studio
                  </ButtonLink>
                  <ButtonLink href="/bulk" variant="outline" size="lg">
                    Wholesale enquiries
                  </ButtonLink>
                </div>
              </Reveal>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
