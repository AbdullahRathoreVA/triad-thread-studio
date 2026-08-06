import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/home/hero";
import { Reveal, RevealLines } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";

const CRAFT_STEPS = [
  {
    n: "01",
    title: "Hide selection",
    body: "Full-grain and top-grain hides are graded by hand. Anything with a scar, brand or loose fibre in a visible panel is rejected before it reaches the cutting table.",
  },
  {
    n: "02",
    title: "Pattern & cut",
    body: "Patterns are graded to your measurements, then nested to the hide's natural stretch so the shoulders hold their line after a hundred wears.",
  },
  {
    n: "03",
    title: "Assembly",
    body: "Stitched at 8–10 stitches per inch with bonded polyester thread. Stress points are bar-tacked. Zips and hardware are set by hand.",
  },
  {
    n: "04",
    title: "Finish & inspect",
    body: "Edges are burnished and sealed, the lining is set, and every piece is checked against its spec sheet before it is boxed.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />

        {/* ---- Positioning statement ------------------------------------- */}
        <section className="relative overflow-hidden border-t border-hairline py-28 md:py-40">
          <div className="container-luxe grid gap-16 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <p className="eyebrow">The Studio</p>
              <div className="rule-fade mt-6 w-24" />
            </Reveal>

            <div>
              <RevealLines
                as="h2"
                lines={["We do not resell.", "We manufacture."]}
                className="font-display text-4xl leading-[1.02] text-ink-50 md:text-5xl"
              />
              <Reveal delay={0.15}>
                <p className="mt-9 max-w-xl text-[0.95rem] leading-[1.85] text-ink-300">
                  Triad Thread Studio is a leather and apparel manufacturer.
                  Every jacket, bag and jersey that carries our name was cut and
                  assembled to a specification — ours or yours. That means we can
                  change a collar, move a pocket, switch a lining or run a
                  thousand units in your colourway, because we own the pattern
                  and the production line.
                </p>
              </Reveal>
              <Reveal delay={0.25}>
                <p className="mt-6 max-w-xl text-[0.95rem] leading-[1.85] text-ink-300">
                  For individual buyers that means a jacket that actually fits.
                  For brands, teams and retailers it means a supply partner who
                  quotes honestly and ships on the date agreed.
                </p>
              </Reveal>
              <Reveal delay={0.35}>
                <div className="mt-11 flex flex-wrap gap-3">
                  <ButtonLink href="/craft" variant="outline">
                    How we build
                  </ButtonLink>
                  <ButtonLink href="/bulk" variant="ghost">
                    Wholesale enquiries →
                  </ButtonLink>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---- Process ---------------------------------------------------- */}
        <section className="border-t border-hairline bg-ink-950 py-28 md:py-40">
          <div className="container-luxe">
            <Reveal>
              <p className="eyebrow">From Hide to Hanger</p>
              <h2 className="mt-7 max-w-2xl font-display text-4xl text-ink-50 md:text-5xl">
                Four stages, none of them rushed.
              </h2>
            </Reveal>

            <ol className="mt-20 grid gap-px sm:grid-cols-2 lg:grid-cols-4">
              {CRAFT_STEPS.map((step, i) => (
                <Reveal
                  as="li"
                  key={step.n}
                  delay={i * 0.08}
                  className="group relative border-t border-hairline pr-8 pt-8"
                >
                  <span className="font-roman text-[0.65rem] tracking-[0.3em] text-gold-300">
                    {step.n}
                  </span>
                  <h3 className="mt-5 font-display text-2xl text-ink-50">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-[0.85rem] leading-[1.8] text-ink-400">
                    {step.body}
                  </p>
                  {/* Rule that draws in on hover. */}
                  <span className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-gold-300 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ---- Custom studio CTA ------------------------------------------ */}
        <section className="relative overflow-hidden border-t border-hairline py-32 md:py-44">
          <div
            aria-hidden="true"
            className="grain absolute inset-0"
            style={{
              background:
                "radial-gradient(90% 120% at 50% 0%, #2a170e 0%, #150905 45%, #0a0a0a 100%)",
            }}
          />
          <div className="container-luxe relative text-center">
            <Reveal>
              <p className="eyebrow">The Custom Studio</p>
            </Reveal>
            <RevealLines
              as="h2"
              lines={["Build it exactly", "the way you want it."]}
              className="mx-auto mt-8 max-w-4xl font-display text-5xl leading-[1.0] text-ink-50 md:text-6xl"
            />
            <Reveal delay={0.2}>
              <p className="mx-auto mt-9 max-w-xl text-[0.95rem] leading-[1.85] text-ink-300">
                Leather, colour, finish, collar, sleeves, hardware, lining,
                embroidery, lettering, measurements. Change anything and watch
                the piece and the price update as you go.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="mt-12">
                <ButtonLink href="/customize" variant="gold" size="lg">
                  Open the Studio
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
