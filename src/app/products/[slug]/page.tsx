import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { BreadcrumbJsonLd, ProductJsonLd } from "@/components/seo/json-ld";
import {
  ProductRender,
  ProductRenderRoot,
} from "@/components/product/product-render";
import { db } from "@/lib/db";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

async function loadProduct(slug: string) {
  try {
    return await db.product.findFirst({
      where: { slug, published: true },
      include: {
        images: { orderBy: { position: "asc" } },
        collection: { select: { slug: true, title: true } },
      },
    });
  } catch (error) {
    console.error("[product] database unavailable", error);
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "Product" };

  return {
    title: product.seoTitle ?? product.title,
    description: product.seoDesc ?? product.description.slice(0, 160),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.seoTitle ?? product.title,
      description: product.seoDesc ?? product.description.slice(0, 160),
      url: `/products/${product.slug}`,
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const specs = Array.isArray(product.specs)
    ? (product.specs as { label: string; value: string }[])
    : [];

  const isJersey = product.category === "SUBLIMATED_JERSEY";

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", href: "/" },
          { name: "Collections", href: "/collections" },
          ...(product.collection
            ? [
                {
                  name: product.collection.title,
                  href: `/collections/${product.collection.slug}`,
                },
              ]
            : []),
          { name: product.title, href: `/products/${product.slug}` },
        ]}
      />
      <ProductJsonLd
        name={product.title}
        description={product.description}
        image={product.images[0]?.url ?? "/brand/logo-primary.jpg"}
        priceCents={product.basePriceCents}
        currency={product.currency}
        sku={product.sku}
      />
      <Nav />

      <main id="main" className="pt-[74px]">
        <ProductRenderRoot>
          <section className="container-luxe grid gap-14 py-14 lg:grid-cols-2 lg:py-20">
            {/* ---- Visual ------------------------------------------------ */}
            <div className="space-y-4">
              <div className="relative aspect-4/5 overflow-hidden rounded-sm border border-hairline bg-ink-850">
                {product.images[0] ? (
                  <Image
                    src={product.images[0].url}
                    alt={product.images[0].alt}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <ProductRender
                    className="absolute inset-0"
                    spec={
                      isJersey
                        ? { kind: "jersey", primaryColour: product.leatherSwatch }
                        : {
                            kind: "jacket",
                            leatherColour: product.leatherSwatch,
                            leatherGrain: product.leatherGrain,
                          }
                    }
                  />
                )}
              </div>

              {product.images.length > 1 && (
                <ul className="grid grid-cols-4 gap-3">
                  {product.images.slice(1, 5).map((img) => (
                    <li
                      key={img.id}
                      className="relative aspect-square overflow-hidden rounded-xs border border-hairline"
                    >
                      <Image
                        src={img.url}
                        alt={img.alt}
                        fill
                        sizes="12vw"
                        className="object-cover"
                      />
                    </li>
                  ))}
                </ul>
              )}

              {product.images.length === 0 && (
                <p className="text-[0.7rem] leading-relaxed text-ink-600">
                  Shown as a 3D render from the exact materials this piece is
                  made in. Photography of the finished garment follows.
                </p>
              )}
            </div>

            {/* ---- Detail ------------------------------------------------ */}
            <div className="lg:pt-6">
              <Reveal>
                {product.collection && (
                  <Link
                    href={`/collections/${product.collection.slug}`}
                    className="eyebrow transition-colors hover:text-gold-200"
                  >
                    {product.collection.title}
                  </Link>
                )}
                <h1 className="mt-5 font-display text-4xl leading-[1.05] text-ink-50 md:text-5xl">
                  {product.title}
                </h1>
                {product.subtitle && (
                  <p className="mt-3 font-display text-xl text-gold-200">
                    {product.subtitle}
                  </p>
                )}
              </Reveal>

              <Reveal delay={0.1}>
                <div className="mt-8 border-y border-hairline py-5">
                  <p className="font-display text-2xl text-ink-50">
                    Priced per run
                  </p>
                  <p className="mt-2 max-w-sm text-[0.8rem] leading-relaxed text-ink-400">
                    Send us the quantity and specification and an owner returns
                    a firm quote — usually the same working day.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.16}>
                <p className="mt-7 text-[0.92rem] leading-[1.85] text-ink-300">
                  {product.description}
                </p>
              </Reveal>

              {product.features.length > 0 && (
                <Reveal delay={0.2}>
                  <ul className="mt-8 space-y-2.5">
                    {product.features.map((f) => (
                      <li
                        key={f}
                        className="flex gap-3 text-[0.85rem] leading-relaxed text-ink-300"
                      >
                        <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-gold-300" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}

              <Reveal delay={0.26}>
                <div className="mt-10 flex flex-wrap gap-3">
                  <ButtonLink href="/bulk" variant="gold" size="lg">
                    Request trade pricing
                  </ButtonLink>
                  <ButtonLink href="/customize" variant="outline" size="lg">
                    Customise this
                  </ButtonLink>
                </div>
              </Reveal>

              {specs.length > 0 && (
                <Reveal delay={0.3}>
                  <h2 className="mt-14 font-roman text-[0.62rem] uppercase tracking-[0.2em] text-gold-300">
                    Specification
                  </h2>
                  <dl className="mt-5">
                    {specs.map((s) => (
                      <div
                        key={s.label}
                        className="flex justify-between gap-6 border-b border-hairline py-3 text-[0.82rem]"
                      >
                        <dt className="text-ink-500">{s.label}</dt>
                        <dd className="text-right text-ink-200">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Reveal>
              )}

              {product.story && (
                <Reveal delay={0.34}>
                  <h2 className="mt-14 font-roman text-[0.62rem] uppercase tracking-[0.2em] text-gold-300">
                    The piece
                  </h2>
                  <p className="mt-4 text-[0.88rem] leading-[1.9] text-ink-300">
                    {product.story}
                  </p>
                </Reveal>
              )}
            </div>
          </section>
        </ProductRenderRoot>
      </main>
      <Footer />
    </>
  );
}
