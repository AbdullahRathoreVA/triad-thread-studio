import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Clause } from "@/components/layout/legal-page";
import { site, PLACEHOLDER } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses and protects your personal information.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const contact =
    site.contact.email === PLACEHOLDER ? "our contact form" : site.contact.email;

  return (
    <LegalPage title="Privacy Policy" updated="6 August 2026">
      <Clause heading="What we collect">
        <p>
          When you place an order or send an enquiry we collect your name, email
          address, and — where you provide them — your phone number, company
          name and delivery address. When you design a piece in the Custom
          Studio we store your specification, any measurements you enter, and
          any reference image you upload.
        </p>
        <p>
          We do not collect payment card details. No card data passes through
          this website at any point.
        </p>
      </Clause>

      <Clause heading="Why we hold it">
        <p>
          To manufacture and deliver what you ordered, to answer your enquiry,
          and to keep a record of the transaction. Measurements are held because
          a made-to-measure pattern is graded from them and may be needed again
          for a repeat order or an alteration.
        </p>
        <p>
          We do not sell your information, and we do not share it for
          advertising.
        </p>
      </Clause>

      <Clause heading="Who processes it for us">
        <p>Your data is handled by a small number of service providers:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <strong className="text-ink-100">Supabase</strong> — database
            hosting for orders, designs and enquiries.
          </li>
          <li>
            <strong className="text-ink-100">Vercel</strong> — website hosting
            and delivery.
          </li>
          <li>
            <strong className="text-ink-100">Resend</strong> — sending order
            confirmations and replies.
          </li>
          <li>
            <strong className="text-ink-100">Cloudinary</strong> — storing
            images, including any reference image you upload.
          </li>
        </ul>
        <p>
          Each processes data only to provide its service to us. Some operate
          servers outside your country.
        </p>
      </Clause>

      <Clause heading="How long we keep it">
        <p>
          Order records are kept for as long as we are required to hold
          transaction records, and for as long as a repeat order or warranty
          claim remains plausible. Enquiries that do not become orders are kept
          while the conversation is live and deleted once it is clearly closed.
          Saved designs that were never ordered are deleted after two years of
          inactivity.
        </p>
      </Clause>

      <Clause heading="Your rights">
        <p>
          You can ask us for a copy of the personal data we hold about you, ask
          us to correct it, or ask us to delete it. Deletion may be limited
          where we are legally required to retain a transaction record.
        </p>
        <p>
          Depending on where you live you may have further rights — for example
          under the UK/EU GDPR or the CCPA — including the right to object to
          processing and to complain to your data protection regulator.
        </p>
        <p>
          To exercise any of these, contact {contact}. We will respond within 30
          days.
        </p>
      </Clause>

      <Clause heading="Cookies">
        <p>
          This site sets no advertising or third-party tracking cookies. A
          single cookie is used to keep staff signed in to the admin area; it is
          never set for ordinary visitors. Your browser&apos;s session storage
          is used once to remember that you have already seen the intro
          animation.
        </p>
      </Clause>

      <Clause heading="Security">
        <p>
          Data is transmitted over HTTPS. Administrative passwords are stored
          only as bcrypt hashes and are never recoverable. Access to customer
          data is limited to the people who need it to fulfil orders.
        </p>
        <p>
          No system is perfect. If we ever become aware of a breach affecting
          your data, we will tell you.
        </p>
      </Clause>

      <Clause heading="Changes">
        <p>
          If this policy changes materially we will update the date at the top
          of this page. Continuing to use the site after a change means you
          accept the updated policy.
        </p>
        <p>
          Questions? <Link href="/contact" className="text-gold-200 underline underline-offset-4">Get in touch</Link>.
        </p>
      </Clause>
    </LegalPage>
  );
}
