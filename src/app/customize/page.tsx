import type { Metadata } from "next";
import { Nav } from "@/components/layout/nav";
import { Configurator } from "@/components/configurator/configurator";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Custom Jacket Studio",
  description:
    "Design your own leather jacket: choose the hide, colour, finish, collar, hardware, lining, embroidery and measurements. Price updates live as you build.",
  alternates: { canonical: "/customize" },
  openGraph: {
    title: "Custom Jacket Studio — Triad Thread Studio",
    description:
      "Design your own leather jacket panel by panel. Live 3D preview and live pricing.",
    url: "/customize",
  },
};

export default function CustomizePage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", href: "/" },
          { name: "Custom Jacket Studio", href: "/customize" },
        ]}
      />
      <Nav />
      <main id="main">
        <h1 className="sr-only">Custom jacket studio</h1>
        <Configurator />
      </main>
    </>
  );
}
