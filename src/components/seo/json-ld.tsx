import { site, PLACEHOLDER, SHOW_PUBLIC_PRICING } from "@/config/site";

/**
 * Structured data helpers.
 *
 * `JsonLd` serialises with a `<` escape so a stray closing tag inside any
 * user-authored CMS string can never break out of the script element.
 */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/** Drop any field still holding a placeholder — invalid data is worse than absent data. */
function omitPlaceholders<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== PLACEHOLDER && v !== undefined),
  );
}

export function OrganizationJsonLd() {
  const address = omitPlaceholders({
    "@type": "PostalAddress",
    streetAddress: site.contact.addressLine1,
    addressLocality: site.contact.city,
    addressRegion: site.contact.region,
    postalCode: site.contact.postalCode,
    addressCountry: site.contact.country,
  });

  const sameAs = Object.values(site.social).filter((v) => v !== PLACEHOLDER);

  return (
    <JsonLd
      data={omitPlaceholders({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: site.name,
        url: site.url,
        logo: `${site.url}/brand/logo-primary.jpg`,
        description: site.description,
        email: site.contact.email,
        telephone: site.contact.phone,
        // Only emit address/sameAs once they carry real values.
        ...(Object.keys(address).length > 1 ? { address } : {}),
        ...(sameAs.length ? { sameAs } : {}),
      })}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; href: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: `${site.url}${item.href}`,
        })),
      }}
    />
  );
}

export function ProductJsonLd({
  name,
  description,
  image,
  priceCents,
  currency = "USD",
  sku,
  inStock = true,
}: {
  name: string;
  description: string;
  image: string;
  priceCents: number;
  currency?: string;
  sku: string;
  inStock?: boolean;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name,
        description,
        image: image.startsWith("http") ? image : `${site.url}${image}`,
        sku,
        brand: { "@type": "Brand", name: site.name },
        // With public pricing off, emitting a price here would put a number
        // into Google's rich result that the owners never agreed to quote.
        offers: {
          "@type": "Offer",
          ...(SHOW_PUBLIC_PRICING
            ? { price: (priceCents / 100).toFixed(2), priceCurrency: currency }
            : { priceSpecification: { "@type": "PriceSpecification", valueAddedTaxIncluded: false } }),
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/PreOrder",
          seller: { "@type": "Organization", name: site.name },
        },
      }}
    />
  );
}

export function FaqJsonLd({ items }: { items: { q: string; a: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      }}
    />
  );
}
