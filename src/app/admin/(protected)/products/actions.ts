"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { z } from "zod";
import { productSchema, collectionSchema } from "@/lib/validation/product";

/**
 * `z.input` not `z.infer`: the schema transforms a decimal price string into
 * integer cents, so what the form sends and what the schema produces are
 * different types. Actions accept the pre-transform shape.
 */
type ProductInput = z.input<typeof productSchema>;
type CollectionInput = z.input<typeof collectionSchema>;

/**
 * SECURITY: each action re-checks the session itself. A "use server" function
 * compiles to a publicly routable POST endpoint — the protected layout gates
 * the page, not this.
 */

type Result =
  | { ok: true; id: string }
  | { ok: false; error: string; field?: string };

/** Clear the public pages a product change is visible on. */
function revalidateProduct(slug: string, collectionSlug?: string | null) {
  revalidatePath("/collections");
  revalidatePath(`/products/${slug}`);
  if (collectionSlug) revalidatePath(`/collections/${collectionSlug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/products");
}

export async function saveProduct(input: ProductInput): Promise<Result> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not signed in." };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first.message,
      field: first.path.join("."),
    };
  }

  const d = parsed.data;

  const data = {
    slug: d.slug,
    sku: d.sku,
    title: d.title,
    subtitle: d.subtitle || null,
    description: d.description,
    story: d.story || null,
    basePriceCents: d.basePriceCents,
    currency: d.currency,
    category: d.category,
    gender: d.gender,
    leatherSwatch: d.leatherSwatch,
    leatherGrain: d.leatherGrain,
    features: d.features.filter(Boolean),
    specs: d.specs as unknown as Prisma.InputJsonValue,
    collectionId: d.collectionId || null,
    published: d.published,
    featured: d.featured,
    position: d.position,
    seoTitle: d.seoTitle || null,
    seoDesc: d.seoDesc || null,
  };

  try {
    const product = d.id
      ? await db.product.update({ where: { id: d.id }, data })
      : await db.product.create({ data });

    const collection = product.collectionId
      ? await db.collection.findUnique({
          where: { id: product.collectionId },
          select: { slug: true },
        })
      : null;

    await db.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        action: d.id ? "product.update" : "product.create",
        entity: "Product",
        entityId: product.id,
        metadata: { slug: product.slug, published: product.published },
      },
    });

    revalidateProduct(product.slug, collection?.slug);
    return { ok: true, id: product.id };
  } catch (error) {
    // A duplicate slug or SKU is the overwhelmingly common failure and the
    // operator can fix it — say which field, rather than "something failed".
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = (error.meta?.target as string[] | undefined)?.[0] ?? "value";
      return {
        ok: false,
        error: `That ${target} is already used by another product.`,
        field: target,
      };
    }
    console.error("[admin/products] save failed", error);
    return { ok: false, error: "Could not save. Please try again." };
  }
}

export async function setProductPublished(
  id: string,
  published: boolean,
): Promise<Result> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not signed in." };

  try {
    const product = await db.product.update({
      where: { id },
      data: { published },
      include: { collection: { select: { slug: true } } },
    });

    await db.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        action: published ? "product.publish" : "product.unpublish",
        entity: "Product",
        entityId: id,
        metadata: { slug: product.slug },
      },
    });

    revalidateProduct(product.slug, product.collection?.slug);
    return { ok: true, id };
  } catch (error) {
    console.error("[admin/products] publish failed", error);
    return { ok: false, error: "Could not update." };
  }
}

/**
 * Products are unpublished, never hard-deleted, when they appear on an order —
 * an invoice must keep resolving. Only an untouched product is truly removed.
 */
export async function deleteProduct(id: string): Promise<Result> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not signed in." };

  const orderCount = await db.orderItem.count({ where: { productId: id } });

  if (orderCount > 0) {
    await db.product.update({ where: { id }, data: { published: false } });
    revalidatePath("/admin/products");
    return {
      ok: false,
      error: `This product appears on ${orderCount} order${
        orderCount === 1 ? "" : "s"
      }, so it was unpublished rather than deleted — deleting it would break those records.`,
    };
  }

  const product = await db.product.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      action: "product.delete",
      entity: "Product",
      entityId: id,
      metadata: { slug: product.slug, title: product.title },
    },
  });

  revalidateProduct(product.slug);
  return { ok: true, id };
}

export async function saveCollection(
  input: CollectionInput,
): Promise<Result> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Not signed in." };

  const parsed = collectionSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first.message, field: first.path.join(".") };
  }

  const d = parsed.data;
  const data = {
    slug: d.slug,
    title: d.title,
    subtitle: d.subtitle || null,
    description: d.description || null,
    position: d.position,
    published: d.published,
    seoTitle: d.seoTitle || null,
    seoDesc: d.seoDesc || null,
  };

  try {
    const collection = d.id
      ? await db.collection.update({ where: { id: d.id }, data })
      : await db.collection.create({ data });

    revalidatePath("/collections");
    revalidatePath(`/collections/${collection.slug}`);
    revalidatePath("/admin/collections");
    revalidatePath("/sitemap.xml");
    return { ok: true, id: collection.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "That slug is already in use.", field: "slug" };
    }
    console.error("[admin/collections] save failed", error);
    return { ok: false, error: "Could not save. Please try again." };
  }
}
