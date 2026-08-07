import Link from "next/link";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/utils";
import {
  PageHeading,
  EmptyState,
  DatabaseDown,
  DataTable,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  let products;
  try {
    products = await db.product.findMany({
      orderBy: [{ published: "desc" }, { position: "asc" }, { createdAt: "desc" }],
      include: {
        collection: { select: { title: true } },
        _count: { select: { images: true } },
      },
    });
  } catch (error) {
    console.error("[admin/products] database unavailable", error);
    return (
      <>
        <PageHeading title="Products" />
        <DatabaseDown />
      </>
    );
  }

  const live = products.filter((p) => p.published).length;

  return (
    <>
      <PageHeading
        title="Products"
        subtitle={`${products.length} total · ${live} live`}
      >
        <Link
          href="/admin/products/new"
          className="rounded-xs border border-gold-300/40 bg-gold-300/8 px-5 py-2.5 font-roman text-[0.66rem] uppercase tracking-[0.18em] text-gold-100 transition-colors hover:border-gold-300"
        >
          New product
        </Link>
      </PageHeading>

      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          body="Add your first piece. Until a photograph is uploaded it will be shown as a 3D render, so a product is sellable the moment you create it."
        />
      ) : (
        <DataTable
          headers={[
            { label: "Product" },
            { label: "Collection" },
            { label: "Images" },
            { label: "Status" },
            { label: "Price", align: "right" },
          ]}
        >
          {products.map((p) => (
            <tr
              key={p.id}
              className="border-b border-hairline/60 transition-colors hover:bg-ink-850/60"
            >
              <td className="py-3.5 pr-4">
                <Link
                  href={`/admin/products/${p.id}`}
                  className="text-gold-200 hover:underline"
                >
                  {p.title}
                </Link>
                <span className="block text-[0.7rem] text-ink-600">{p.sku}</span>
              </td>
              <td className="py-3.5 pr-4 text-[0.8rem] text-ink-400">
                {p.collection?.title ?? "—"}
              </td>
              <td className="py-3.5 pr-4 text-[0.8rem]">
                {p._count.images === 0 ? (
                  <span
                    className="text-ink-500"
                    title="Shown as a 3D render until a photograph is added"
                  >
                    3D render
                  </span>
                ) : (
                  <span className="text-ink-300">{p._count.images}</span>
                )}
              </td>
              <td className="py-3.5 pr-4">
                <span
                  className={
                    p.published
                      ? "font-roman text-[0.58rem] uppercase tracking-[0.16em] text-emerald-300"
                      : "font-roman text-[0.58rem] uppercase tracking-[0.16em] text-ink-500"
                  }
                >
                  {p.published ? "Live" : "Draft"}
                </span>
              </td>
              <td className="py-3.5 text-right tabular-nums text-ink-200">
                {formatPrice(p.basePriceCents, p.currency)}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
