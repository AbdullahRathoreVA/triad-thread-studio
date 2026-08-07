import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeading, DatabaseDown } from "@/components/admin/ui";
import {
  ProductForm,
  EMPTY_PRODUCT,
  type ProductFormValues,
} from "../product-form";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function ProductEditPage({ params }: Params) {
  const { id } = await params;
  const isNew = id === "new";

  let collections: { id: string; title: string }[];
  let initial: ProductFormValues;

  try {
    collections = await db.collection.findMany({
      orderBy: { position: "asc" },
      select: { id: true, title: true },
    });

    if (isNew) {
      initial = EMPTY_PRODUCT;
    } else {
      const product = await db.product.findUnique({ where: { id } });
      if (!product) notFound();

      initial = {
        id: product.id,
        slug: product.slug,
        sku: product.sku,
        title: product.title,
        subtitle: product.subtitle ?? "",
        description: product.description,
        story: product.story ?? "",
        // Cents back to a decimal string for the form field.
        price: (product.basePriceCents / 100).toFixed(2),
        currency: product.currency,
        category: product.category,
        gender: product.gender,
        leatherSwatch: product.leatherSwatch,
        leatherGrain: product.leatherGrain,
        features: product.features,
        specs: Array.isArray(product.specs)
          ? (product.specs as { label: string; value: string }[])
          : [],
        collectionId: product.collectionId ?? "",
        published: product.published,
        featured: product.featured,
        position: product.position,
        seoTitle: product.seoTitle ?? "",
        seoDesc: product.seoDesc ?? "",
      };
    }
  } catch (error) {
    console.error("[admin/product] database unavailable", error);
    return (
      <>
        <PageHeading
          title="Product"
          back={{ href: "/admin/products", label: "All products" }}
        />
        <DatabaseDown />
      </>
    );
  }

  return (
    <>
      <PageHeading
        title={isNew ? "New product" : initial.title || "Product"}
        subtitle={isNew ? undefined : `/products/${initial.slug}`}
        back={{ href: "/admin/products", label: "All products" }}
      />
      <ProductForm initial={initial} collections={collections} />
    </>
  );
}
