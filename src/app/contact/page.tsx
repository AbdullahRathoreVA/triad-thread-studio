import type { Metadata } from "next";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { Reveal } from "@/components/ui/reveal";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { site, PLACEHOLDER } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Speak to Triad Thread Studio about a custom piece, a wholesale run, or manufacturing to your own pattern and label.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const hasEmail = site.contact.email !== PLACEHOLDER;
  const hasPhone = site.contact.phone !== PLACEHOLDER;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", href: "/" },
          { name: "Contact", href: "/contact" },
        ]}
      />
      <Nav />
      <main id="main" className="pt-[74px]">
        <section className="container-luxe py-24 md:py-32">
          <div className="grid gap-16 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <Reveal>
                <p className="eyebrow">Contact</p>
                <h1 className="mt-7 font-display text-5xl leading-[1.02] text-ink-50 md:text-6xl">
                  Tell us what
                  <br />
                  you need made.
                </h1>
                <div className="rule-fade mt-9 w-28" />
              </Reveal>

              <Reveal delay={0.12}>
                <p className="mt-9 max-w-sm text-[0.92rem] leading-[1.85] text-ink-300">
                  One piece or ten thousand. Send a sketch, a reference, a tech
                  pack, or just a description — we will come back with an honest
                  quote and a real production date.
                </p>
              </Reveal>

              {(hasEmail || hasPhone) && (
                <Reveal delay={0.2}>
                  <dl className="mt-11 space-y-5 border-t border-hairline pt-9">
                    {hasEmail && (
                      <div>
                        <dt className="text-[0.68rem] uppercase tracking-wider text-ink-500">
                          Email
                        </dt>
                        <dd className="mt-1.5">
                          <a
                            href={`mailto:${site.contact.email}`}
                            className="text-[0.95rem] text-gold-200 transition-colors hover:text-gold-100"
                          >
                            {site.contact.email}
                          </a>
                        </dd>
                      </div>
                    )}
                    {hasPhone && (
                      <div>
                        <dt className="text-[0.68rem] uppercase tracking-wider text-ink-500">
                          Phone
                        </dt>
                        <dd className="mt-1.5">
                          <a
                            href={`tel:${site.contact.phone}`}
                            className="text-[0.95rem] text-gold-200 transition-colors hover:text-gold-100"
                          >
                            {site.contact.phone}
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                </Reveal>
              )}
            </div>

            <Reveal delay={0.15}>
              <div className="rounded-sm border border-hairline bg-ink-850/50 p-7 md:p-10">
                <EnquiryForm type="GENERAL" />
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
