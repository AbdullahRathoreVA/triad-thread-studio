import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import {
  ProductRender,
  ProductRenderRoot,
} from "@/components/product/product-render";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

async function loadCollection(slug: string) {
  try {
    return await db.collection.findFirst({
      where: { slug, published: true },
      include: {
        products: {
          where: { published: true },
          orderBy: [{ featured: "desc" }, { position: "asc" }],
          include: {
            images: { orderBy: { position: "asc" }, take: 1 },
          },
        },
      },
    });
  } catch (error) {
    console.error("[collection] database unavailable", error);
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const collection = await loadCollection(slug);

  if (!collection) return { title: "Collection" };

  return {
    title: collection.seoTitle ?? collection.title,
    description:
      collection.seoDesc ?? collection.description ?? collection.subtitle ?? undefined,
    alternates: { canonical: `/collections/${collection.slug}` },
  };
}

export default async function CollectionPage({ params }: Params) {
  const { slug } = await params;
  const collection = await loadCollection(slug);

  // A missing database returns null too. Distinguishing them matters: a 404
  // on a real collection because Postgres blinked would get the URL
  // deindexed, so only 404 when the database answered and had no row.
  if (collection === null) {
    return (
      <>
        <Nav />
        <main id="main" className="pt-[74px]">
          <div className="container-luxe py-32 text-center">
            <h1 className="font-display text-3xl text-ink-100">
              This collection is temporarily unavailable
            </h1>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-ink-400">
              We could not load it just now. Please try again shortly.
            </p>
            <div className="mt-9">
              <ButtonLink href="/collections" variant="outline">
                All collections
              </ButtonLink>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!collection) notFound();

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", href: "/" },
          { name: "Collections", href: "/collections" },
          { name: collection.title, href: `/collections/${collection.slug}` },
        ]}
      />
      <Nav />

      <main id="main" className="pt-[74px]">
        <section className="container-luxe py-20 md:py-28">
          <Reveal>
            <Link
              href="/collections"
              className="font-roman text-[0.6rem] uppercase tracking-[0.22em] text-ink-500 transition-colors hover:text-gold-200"
            >
              ← All collections
            </Link>
            <h1 className="mt-8 font-display text-5xl leading-[1.02] text-ink-50 md:text-6xl">
              {collection.title}
            </h1>
            {collection.subtitle && (
              <p className="mt-5 font-display text-2xl text-gold-200">
                {collection.subtitle}
              </p>
            )}
            {collection.description && (
              <p className="mt-8 max-w-xl text-[0.92rem] leading-[1.85] text-ink-300">
                {collection.description}
              </p>
            )}
          </Reveal>
        </section>

        {/* One shared WebGL context for the whole grid — see ProductRenderRoot. */}
        {collection.products.length === 0 ? (
          <section className="border-t border-hairline">
            <div className="container-luxe py-24 text-center md:py-28">
              <Reveal>
                <h2 className="mx-auto max-w-lg font-display text-3xl text-ink-100">
                  Pieces from this collection are being photographed.
                </h2>
                <p className="mx-auto mt-5 max-w-md text-[0.9rem] leading-[1.85] text-ink-400">
                  You can still specify one exactly as you want it, or ask us
                  for a wholesale quote.
                </p>
                <div className="mt-10 flex flex-wrap justify-center gap-3">
                  <ButtonLink href="/customize" variant="gold">
                    Design one
                  </ButtonLink>
                  <ButtonLink href="/bulk" variant="outline">
                    Wholesale
                  </ButtonLink>
                </div>
              </Reveal>
            </div>
          </section>
        ) : (
          <ProductRenderRoot>
          <section className="border-t border-hairline">
            <ul className="container-luxe grid gap-x-8 gap-y-14 py-14 sm:grid-cols-2 lg:grid-cols-3">
              {collection.products.map((product, i) => {
                const image = product.images[0];
                return (
                  <Reveal as="li" key={product.id} delay={(i % 3) * 0.06}>
                    <Link href={`/products/${product.slug}`} className="group block">
                      <div className="relative aspect-4/5 overflow-hidden rounded-sm border border-hairline bg-ink-850">
                        {image ? (
                          <Image
                            src={image.url}
                            alt={image.alt}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                          />
                        ) : (
                          /* No photograph: render the product in 3D from the
                             same geometry and materials the configurator uses.
                             Our own imagery, and it always matches what can
                             actually be ordered. */
                          <ProductRender
                            className="absolute inset-0"
                            spec={
                              product.category === "SUBLIMATED_JERSEY"
                                ? {
                                    kind: "jersey",
                                    primaryColour: product.leatherSwatch,
                                  }
                                : {
                                    kind: "jacket",
                                    leatherColour: product.leatherSwatch,
                                    leatherGrain: product.leatherGrain,
                                  }
                            }
                          />
                        )}
                      </div>

                      <h2 className="mt-5 font-display text-xl text-ink-50 transition-colors group-hover:text-gold-200">
                        {product.title}
                      </h2>
                      {product.subtitle && (
                        <p className="mt-1.5 text-[0.8rem] text-ink-500">
                          {product.subtitle}
                        </p>
                      )}
                      <p className="mt-2.5 text-[0.85rem] tabular-nums text-gold-200">
                        {formatPrice(product.basePriceCents, product.currency)}
                      </p>
                    </Link>
                  </Reveal>
                );
              })}
            </ul>
          </section>
          </ProductRenderRoot>
        )}
      </main>
      <Footer />
    </>
  );
}
