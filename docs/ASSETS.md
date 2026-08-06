# Assets

## What was supplied

**`logo-primary.jpg`** (1254×1254) — the brand logo. Excellent, and now the
source of truth for the entire visual system. Sampling it produced the palette
in `globals.css`:

| Role | Hex | Share of logo |
|---|---|---|
| Page base | `#0A0A0A` | 67% |
| Elevated surface | `#131313` | 20% |
| Leather browns | `#45271A` – `#664837` | — |
| Gold / bronze | `#765839` – `#B79976` | — |
| Silver (needle, wordmark) | `#8E9095` – `#EEEFF1` | — |

The logo's own typography — engraved Roman capitals — is matched with Cinzel
for eyebrows and labels; Cormorant Garamond carries display headings.

## What was NOT usable

Eight jacket images were also supplied. **None are used anywhere in this
codebase**, for reasons that would have become expensive later:

| Image | Problem |
|---|---|
| Black moto (554×554) | Tiled **`pngtree` watermark** — unlicensed stock |
| Beige bomber (479×640) | Another brand's **signature embroidered on the hem**; a retailer's product shot |
| Cream cropped moto (520×650) | Retailer product shot, another label |
| White women's moto (533×581) | Retailer cutout |
| Remaining four | Generic stock or search-result thumbnails |
| **All eight** | ≤1280px — far below what a full-bleed hero needs |

Two distinct problems:

1. **Legal.** Publishing another company's product photography on a commercial
   storefront is copyright infringement. The watermarked one is unambiguous.
2. **Commercial.** The site's core claim is *"we manufacture this."* Illustrating
   that with competitors' photos undermines the exact trust it needs to build,
   and anyone reverse-image-searching finds the real source.

## How the site works without photography

The visual language is deliberately photo-independent:

- **Procedural leather.** `lib/three/leather-texture.ts` generates albedo,
  normal and roughness maps at runtime from Worley noise. Every leather option
  renders its own material — no textures to license or ship.
- **3D garment.** The configurator shows a real, rotatable jacket built from
  extruded pattern pieces wearing the customer's actual selections.
- **Typography and material lead.** Layout carries the luxury signal rather
  than leaning on hero photography.

Nothing needs redesigning when real photography arrives.

## What to shoot

When you photograph your own products, this is what the build expects:

**Technical**
- 2400px on the long edge minimum (3000px+ for hero use)
- Consistent lighting across a collection — mismatched white balance is the
  fastest way to look like a dropshipper
- Neutral seamless background (`#0A0A0A`–`#131313` matches the site) or a
  clean cutout with a transparent PNG
- sRGB, then upload to Cloudinary; Next's image pipeline handles AVIF/WebP

**Per product**
- Front, back, and both three-quarter angles
- Detail crops: grain close-up, zip/hardware, stitching, lining, label
- Worn shot if possible — scale and drape are what convert
- Optional: 24–36 frames on a turntable for the 360° viewer
  (`ProductImage.is360` is already in the schema)

**Wiring them in**
1. Upload to Cloudinary
2. Add `ProductImage` rows with the URL and a **real `alt`** — the field is
   non-optional on purpose; empty alt text is both an accessibility failure and
   a lost image-search ranking
3. Set `Product.leatherSwatch` / `leatherGrain` so the 3D preview matches
