import type { Metadata } from "next";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { Reveal, RevealLines } from "@/components/ui/reveal";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/components/seo/json-ld";
import { BULK_TIERS, BASE_LEAD_TIME_DAYS } from "@/config/configurator";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Bulk & Wholesale",
  description:
    "Wholesale leather jackets and sublimated jerseys for retailers, clothing brands, corporate clients and sports teams. Tiered pricing from 12 units, manufacturing to your own pattern and label.",
  alternates: { canonical: "/bulk" },
  openGraph: {
    title: "Bulk & Wholesale Manufacturing — Triad Thread Studio",
    description:
      "Tiered pricing from 12 units. We manufacture under your label, to your pattern and spec.",
    url: "/bulk",
  },
};

const AUDIENCES = [
  {
    title: "Clothing brands",
    body: "Manufacture under your own label. Send a tech pack, a pattern or a physical sample and we will quote against it.",
  },
  {
    title: "Retailers & distributors",
    body: "Stock-ready pieces in your chosen colourways and size curve, with repeatable quality across repeat runs.",
  },
  {
    title: "Sports teams & clubs",
    body: "Full-colour sublimated jerseys, edge to edge. Numbers, names and sponsor placement included in the run.",
  },
  {
    title: "Corporate & hospitality",
    body: "Uniform outerwear and leather goods carrying your identity — embroidered, embossed or printed.",
  },
];

const FAQS = [
  {
    q: "What is the minimum order quantity?",
    a: `Tiered pricing begins at ${BULK_TIERS[1].minQty} units, but there is no hard minimum — we produce single custom pieces too. Below 12 units you simply pay the standard price.`,
  },
  {
    q: "Can you manufacture to our own pattern and label?",
    a: "Yes. Send a tech pack, a graded pattern or a physical sample. We produce under our clients' own labels routinely, including custom neck labels, care labels and hangtags.",
  },
  {
    q: "How is bulk pricing calculated?",
    a: `Discounts are applied to the order subtotal by tier: ${BULK_TIERS.slice(1)
      .map((t) => `${t.minQty}+ units at ${t.discountBps / 100}%`)
      .join(", ")}. The Custom Studio shows the exact figure live as you change quantity.`,
  },
  {
    q: "Do you produce sample units before a full run?",
    a: "Yes, and we recommend it for any first order above 50 units. A pre-production sample is quoted separately and its cost is credited against the bulk order when it proceeds.",
  },
  {
    q: "What are your lead times for volume orders?",
    a: `Standard production starts at ${BASE_LEAD_TIME_DAYS} working days and scales with quantity and specification. Custom dye matching, shearling lining and made-to-measure grading each add time — the Custom Studio shows exactly how much before you commit.`,
  },
];

export default function BulkPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", href: "/" },
          { name: "Bulk & Wholesale", href: "/bulk" },
        ]}
      />
      <FaqJsonLd items={FAQS} />
      <Nav />

      <main id="main" className="pt-[74px]">
        {/* ---- Hero ------------------------------------------------------ */}
        <section className="relative overflow-hidden py-24 md:py-36">
          <div
            aria-hidden="true"
            className="grain absolute inset-0"
            style={{
              background:
                "radial-gradient(80% 100% at 20% 0%, #2a170e 0%, #150905 42%, #0a0a0a 100%)",
            }}
          />
          <div className="container-luxe relative">
            <Reveal>
              <p className="eyebrow">Bulk &amp; Wholesale</p>
            </Reveal>
            <RevealLines
              as="h1"
              lines={["Your label.", "Our production line."]}
              className="mt-7 font-display text-5xl leading-[1.0] text-ink-50 md:text-7xl"
            />
            <Reveal delay={0.2}>
              <p className="mt-9 max-w-xl text-[0.95rem] leading-[1.85] text-ink-300">
                We own the patterns and the machines, so a change of collar,
                hardware, lining or colourway is a production instruction rather
                than a negotiation. Quote honestly, ship on the agreed date.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ---- Tiers ------------------------------------------------------ */}
        <section className="border-t border-hairline py-24 md:py-32">
          <div className="container-luxe">
            <Reveal>
              <p className="eyebrow">Volume Pricing</p>
              <h2 className="mt-6 max-w-2xl font-display text-4xl text-ink-50 md:text-5xl">
                The discount is automatic, and it is visible before you commit.
              </h2>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="mt-14 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left">
                  <caption className="sr-only">
                    Bulk discount tiers by order quantity
                  </caption>
                  <thead>
                    <tr className="border-b border-hairline">
                      <th
                        scope="col"
                        className="pb-4 font-roman text-[0.62rem] uppercase tracking-[0.2em] text-gold-300"
                      >
                        Quantity
                      </th>
                      <th
                        scope="col"
                        className="pb-4 text-right font-roman text-[0.62rem] uppercase tracking-[0.2em] text-gold-300"
                      >
                        Discount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {BULK_TIERS.map((tier) => (
                      <tr key={tier.minQty} className="border-b border-hairline/60">
                        <td className="py-5 font-display text-2xl text-ink-100">
                          {tier.minQty === 1
                            ? "1 – 11"
                            : `${tier.minQty.toLocaleString()}+`}
                        </td>
                        <td className="py-5 text-right font-display text-2xl tabular-nums text-gilt">
                          {tier.discountBps === 0
                            ? "—"
                            : `${tier.discountBps / 100}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="mt-7 max-w-lg text-[0.8rem] leading-relaxed text-ink-500">
                Applied to the order subtotal, before shipping and tax. Larger
                or recurring programmes are quoted individually — talk to us.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ---- Audiences -------------------------------------------------- */}
        <section className="border-t border-hairline bg-ink-950 py-24 md:py-32">
          <div className="container-luxe">
            <Reveal>
              <p className="eyebrow">Who We Supply</p>
            </Reveal>
            <ul className="mt-14 grid gap-px sm:grid-cols-2">
              {AUDIENCES.map((item, i) => (
                <Reveal
                  as="li"
                  key={item.title}
                  delay={i * 0.07}
                  className="border-t border-hairline py-8 pr-8"
                >
                  <h3 className="font-display text-2xl text-ink-50">{item.title}</h3>
                  <p className="mt-3.5 max-w-sm text-[0.85rem] leading-[1.8] text-ink-400">
                    {item.body}
                  </p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- FAQ -------------------------------------------------------- */}
        <section className="border-t border-hairline py-24 md:py-32">
          <div className="container-luxe grid gap-16 lg:grid-cols-[0.7fr_1.3fr]">
            <Reveal>
              <p className="eyebrow">Common Questions</p>
              <div className="rule-fade mt-6 w-24" />
            </Reveal>

            <dl>
              {FAQS.map((faq, i) => (
                <Reveal key={faq.q} delay={i * 0.06} className="border-t border-hairline py-7">
                  <dt className="font-display text-xl text-ink-50">{faq.q}</dt>
                  <dd className="mt-3 max-w-2xl text-[0.85rem] leading-[1.85] text-ink-400">
                    {faq.a}
                  </dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        {/* ---- Enquiry ---------------------------------------------------- */}
        <section
          id="enquire"
          className="border-t border-hairline bg-ink-950 py-24 md:py-32"
        >
          <div className="container-luxe grid gap-16 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <p className="eyebrow">Request a Quote</p>
              <h2 className="mt-6 font-display text-4xl leading-[1.05] text-ink-50">
                Tell us the spec and the numbers.
              </h2>
              <p className="mt-6 max-w-sm text-[0.9rem] leading-[1.85] text-ink-400">
                The more detail you give — product, quantity, target price,
                timeline, whether you have a tech pack — the more precise the
                quote comes back. {site.production.minimumBulkQuantity}+ units
                qualifies for tier pricing.
              </p>
            </Reveal>

            <Reveal delay={0.12}>
              <div className="rounded-sm border border-hairline bg-ink-850/50 p-7 md:p-10">
                <EnquiryForm
                  type="WHOLESALE"
                  showQuantity
                  submitLabel="Request a quote"
                />
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
