import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Clause } from "@/components/layout/legal-page";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms of Sale",
  description: `Terms governing orders placed with ${site.name}, including custom and bulk manufacturing.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Sale" updated="6 August 2026">
      <Clause heading="Orders are an offer, not a contract">
        <p>
          Submitting an order through this website is an offer to buy. A
          contract forms only when we confirm the specification and accept the
          order in writing. We may decline an order — for example if a
          specification cannot be manufactured as described, or if a listed
          price was obviously wrong.
        </p>
      </Clause>

      <Clause heading="Pricing">
        <p>
          Prices shown in the Custom Studio are calculated from your
          specification and are correct at the moment they are displayed. If
          our pricing changes between you starting a design and submitting it,
          you will be shown the new total and asked to confirm before anything
          is ordered. We will never charge a different figure from the one you
          agreed to.
        </p>
        <p>
          No payment is taken through this website. We invoice separately once
          the specification is confirmed, and production begins after payment
          terms are met.
        </p>
      </Clause>

      <Clause heading="Lead times">
        <p>
          Production times quoted in the Custom Studio are working-day estimates
          from the start of production, not from the date of enquiry. They
          exclude shipping transit. Options such as custom dye matching,
          shearling lining and made-to-measure grading extend production, and
          the additional time is shown against each option before you select it.
        </p>
        <p>
          We will tell you promptly if a date is at risk. Estimates are given in
          good faith and are not guarantees.
        </p>
      </Clause>

      <Clause heading="Custom and made-to-measure pieces">
        <p>
          A custom piece is cut to your specification and cannot be resold. Once
          cutting has begun, a custom order cannot be cancelled or returned
          except where the piece is faulty or does not match the confirmed
          specification. This does not affect your statutory rights in respect
          of faulty goods.
        </p>
        <p>
          Measurements you supply are used exactly as given. We will query
          anything that looks inconsistent before cutting, but we cannot
          remake a correctly-manufactured piece free of charge because the
          measurements supplied were wrong.
        </p>
      </Clause>

      <Clause heading="Natural variation in leather">
        <p>
          Leather is a natural material. Grain, tone and texture vary between
          hides and within a single hide, and colour may differ slightly from
          what a screen displays. Visible grain variation, healed scars and
          natural markings are characteristics of genuine full-grain leather,
          not defects.
        </p>
      </Clause>

      <Clause heading="Bulk and wholesale orders">
        <p>
          Volume orders are governed by the written quotation and any separate
          supply agreement, which take precedence over these terms where they
          conflict. We strongly recommend approving a pre-production sample
          before a first run above 50 units; a run manufactured to an approved
          sample is deemed to conform.
        </p>
        <p>
          Where we manufacture to your pattern, artwork or label, you confirm
          you hold the rights to it and accept responsibility for any
          third-party claim arising from its use.
        </p>
      </Clause>

      <Clause heading="Faults and returns">
        <p>
          If a piece arrives faulty or does not match the confirmed
          specification, tell us within 14 days of delivery with photographs. We
          will repair, remake or refund it at our discretion. Return shipping on
          a genuinely faulty item is at our cost.
        </p>
        <p>
          Damage from wear, misuse, improper cleaning or unauthorised
          alteration is not covered.
        </p>
      </Clause>

      <Clause heading="Liability">
        <p>
          Our liability in connection with any order is limited to the amount
          you paid for it. We are not liable for indirect or consequential loss,
          including lost profit or lost business opportunity.
        </p>
        <p>
          Nothing here limits liability for death or personal injury caused by
          negligence, for fraud, or for anything else that cannot lawfully be
          limited.
        </p>
      </Clause>

      <Clause heading="Contact">
        <p>
          Questions about these terms or an existing order?{" "}
          <Link href="/contact" className="text-gold-200 underline underline-offset-4">
            Contact us
          </Link>{" "}
          quoting your order number.
        </p>
      </Clause>
    </LegalPage>
  );
}
