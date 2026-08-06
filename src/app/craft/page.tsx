import type { Metadata } from "next";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { Reveal, RevealLines } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { LEATHERS } from "@/config/configurator";

export const metadata: Metadata = {
  title: "Craft",
  description:
    "How Triad Thread Studio selects hides, grades patterns, and assembles a leather jacket — from tannery to finished piece.",
  alternates: { canonical: "/craft" },
};

const STAGES = [
  {
    n: "01",
    title: "The hide",
    body: "Hides are bought whole and graded by hand. A hide is a record of an animal's life: scars, insect marks and brand marks are all normal, and all decide where a panel can be cut from. Anything that would put a flaw in a shoulder, a chest or a sleeve front is cut around or rejected outright.",
    aside: "Full-grain keeps the outermost layer intact. It is the strongest part of the hide and the only part that develops a real patina.",
  },
  {
    n: "02",
    title: "Pattern and grading",
    body: "A pattern is not a drawing, it is a set of instructions with tolerances. For made-to-measure we grade from your measurements rather than scaling a stock size — a scaled pattern gets the chest right and the shoulder wrong, which is why a jacket can fit and still look borrowed.",
    aside: "Women's patterns are graded from a women's block, not reduced from a men's. The difference shows in the shoulder slope and sleeve pitch.",
  },
  {
    n: "03",
    title: "Cutting",
    body: "Panels are nested to the hide's natural stretch. Leather gives more across the backbone than along it, so a panel cut in the wrong orientation will bag out at the elbow within a season. Cutting to the stretch is invisible on day one and obvious after a hundred wears.",
    aside: "This is the single stage where cheap manufacturing saves the most money and costs the customer the most.",
  },
  {
    n: "04",
    title: "Assembly",
    body: "Stitched at 8–10 stitches per inch in bonded polyester — stronger than cotton and it will not rot where sweat sits. Stress points at the pocket corners, armhole and hem are bar-tacked. Zips and hardware are set by hand, because a press set slightly off square shows forever.",
    aside: "Thread tension is checked at the start of every panel. A loose seam looks fine and fails in a year.",
  },
  {
    n: "05",
    title: "Finishing",
    body: "Edges are burnished and sealed so they will not fray or drink water. The lining is set last and by hand, since a machine-set lining pulls the shell out of shape. Every piece is checked against its own spec sheet before it is boxed.",
    aside: "If a piece does not match its spec sheet, it does not ship. That is the whole quality system.",
  },
];

export default function CraftPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", href: "/" },
          { name: "Craft", href: "/craft" },
        ]}
      />
      <Nav />

      <main id="main" className="pt-[74px]">
        <section className="relative overflow-hidden py-24 md:py-36">
          <div
            aria-hidden="true"
            className="grain absolute inset-0"
            style={{
              background:
                "radial-gradient(85% 100% at 70% 10%, #3a2114 0%, #1a0d06 45%, #0a0a0a 100%)",
            }}
          />
          <div className="container-luxe relative">
            <Reveal>
              <p className="eyebrow">Craft</p>
            </Reveal>
            <RevealLines
              as="h1"
              lines={["Nothing here", "is decorative."]}
              className="mt-7 font-display text-5xl leading-[1.0] text-ink-50 md:text-7xl"
            />
            <Reveal delay={0.2}>
              <p className="mt-9 max-w-xl text-[0.95rem] leading-[1.85] text-ink-300">
                Every choice below exists because of how leather actually
                behaves — how it stretches, where it fails, and what it does
                after a hundred wears. None of it is visible in a photograph.
                All of it is visible in year three.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ---- Stages ----------------------------------------------------- */}
        <section className="border-t border-hairline py-20 md:py-28">
          <div className="container-luxe">
            <ol className="space-y-px">
              {STAGES.map((stage, i) => (
                <Reveal
                  as="li"
                  key={stage.n}
                  delay={i * 0.05}
                  className="grid gap-8 border-t border-hairline py-12 md:grid-cols-[auto_1.4fr_1fr] md:gap-12"
                >
                  <span className="font-roman text-[0.68rem] tracking-[0.3em] text-gold-300">
                    {stage.n}
                  </span>

                  <div>
                    <h2 className="font-display text-3xl text-ink-50">
                      {stage.title}
                    </h2>
                    <p className="mt-5 text-[0.9rem] leading-[1.9] text-ink-300">
                      {stage.body}
                    </p>
                  </div>

                  <p className="self-start border-l border-gold-300/25 pl-6 text-[0.8rem] leading-[1.85] text-ink-500">
                    {stage.aside}
                  </p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ---- Materials -------------------------------------------------- */}
        <section className="border-t border-hairline bg-ink-950 py-24 md:py-32">
          <div className="container-luxe">
            <Reveal>
              <p className="eyebrow">The Materials</p>
              <h2 className="mt-6 max-w-2xl font-display text-4xl text-ink-50 md:text-5xl">
                Six hides, each with a reason to exist.
              </h2>
            </Reveal>

            <ul className="mt-16 grid gap-px sm:grid-cols-2 lg:grid-cols-3">
              {LEATHERS.map((leather, i) => (
                <Reveal
                  as="li"
                  key={leather.id}
                  delay={i * 0.05}
                  className="border-t border-hairline py-8 pr-8"
                >
                  <span
                    aria-hidden="true"
                    className="block size-10 rounded-full border border-white/10"
                    style={{ backgroundColor: leather.swatch }}
                  />
                  <h3 className="mt-5 font-display text-xl text-ink-50">
                    {leather.label}
                  </h3>
                  <p className="mt-2.5 text-[0.82rem] leading-[1.75] text-ink-400">
                    {leather.description}
                  </p>
                </Reveal>
              ))}
            </ul>

            <Reveal delay={0.2}>
              <div className="mt-16">
                <ButtonLink href="/customize" variant="gold" size="lg">
                  Build with these
                </ButtonLink>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
