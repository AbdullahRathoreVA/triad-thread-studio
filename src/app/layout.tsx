import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Cinzel, Inter } from "next/font/google";
import { site } from "@/config/site";
import { SmoothScroll } from "@/components/layout/smooth-scroll";
import { Cursor } from "@/components/layout/cursor";
import { Preloader } from "@/components/layout/preloader";
import { OrganizationJsonLd } from "@/components/seo/json-ld";
import "./globals.css";

/**
 * Three typefaces, each with one job:
 *  - Cormorant Garamond: display headings. High stroke contrast reads as
 *    couture, and it is the closest free face to the logo's engraved wordmark.
 *  - Cinzel: Roman capitals for eyebrows and labels — a near match for the
 *    "TRIAD THREAD STUDIO" lettering itself.
 *  - Inter: everything functional. Neutral, and legible at 12px in a spec table.
 */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-cinzel",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Premium Leather Jackets & Custom Manufacturing`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "leather jacket manufacturer",
    "custom leather jackets",
    "premium leather products",
    "sublimated jerseys",
    "motorcycle leather jackets",
    "wholesale leather jackets",
    "bulk leather manufacturing",
  ],
  openGraph: {
    type: "website",
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title: `${site.name} — Premium Leather Jackets & Custom Manufacturing`,
    description: site.description,
    images: [{ url: "/og/default.png", width: 1200, height: 630, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — Premium Leather Jackets & Custom Manufacturing`,
    description: site.description,
    images: ["/og/default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${cinzel.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased">
        <OrganizationJsonLd />

        {/* Keyboard users must be able to escape the fixed nav immediately. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-200 focus:rounded-sm focus:bg-gold-300 focus:px-5 focus:py-3 focus:font-sans focus:text-sm focus:font-medium focus:text-ink-950"
        >
          Skip to content
        </a>

        <Preloader />
        <Cursor />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
