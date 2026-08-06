import Link from "next/link";
import Image from "next/image";
import { site, primaryNav, PLACEHOLDER } from "@/config/site";

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
};

export function Footer() {
  const socials = Object.entries(site.social).filter(
    ([, href]) => href !== PLACEHOLDER,
  );
  const hasContact = site.contact.email !== PLACEHOLDER;

  return (
    <footer className="relative border-t border-hairline bg-ink-950">
      <div className="container-luxe grid gap-14 py-20 md:grid-cols-[1.3fr_1fr_1fr] md:py-24">
        <div>
          <Image
            src="/brand/logo-primary.jpg"
            alt={`${site.name} logo`}
            width={132}
            height={132}
            className="rounded-sm"
          />
          <p className="mt-7 max-w-xs text-sm leading-relaxed text-ink-400">
            {site.description}
          </p>
        </div>

        <nav aria-label="Footer">
          <p className="eyebrow">Explore</p>
          <ul className="mt-6 space-y-3">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-ink-300 transition-colors hover:text-gold-200"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="eyebrow">Contact</p>
          {hasContact ? (
            <ul className="mt-6 space-y-3 text-sm text-ink-300">
              <li>
                <a
                  href={`mailto:${site.contact.email}`}
                  className="transition-colors hover:text-gold-200"
                >
                  {site.contact.email}
                </a>
              </li>
              {site.contact.phone !== PLACEHOLDER && (
                <li>
                  <a
                    href={`tel:${site.contact.phone}`}
                    className="transition-colors hover:text-gold-200"
                  >
                    {site.contact.phone}
                  </a>
                </li>
              )}
            </ul>
          ) : (
            /* Rather than print a fake address, point at the form that works. */
            <p className="mt-6 text-sm leading-relaxed text-ink-400">
              Reach the studio through the{" "}
              <Link href="/contact" className="text-gold-200 underline underline-offset-4">
                enquiry form
              </Link>
              .
            </p>
          )}

          {socials.length > 0 && (
            <ul className="mt-8 flex gap-5">
              {socials.map(([key, href]) => (
                <li key={key}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer me"
                    className="font-roman text-[0.62rem] uppercase tracking-[0.2em] text-ink-400 transition-colors hover:text-gold-300"
                  >
                    {SOCIAL_LABELS[key] ?? key}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="container-luxe flex flex-col gap-3 border-t border-hairline py-7 text-[0.7rem] text-ink-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
        <div className="flex gap-6">
          <Link href="/privacy" className="transition-colors hover:text-ink-300">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-ink-300">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
