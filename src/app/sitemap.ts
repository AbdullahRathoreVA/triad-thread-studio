import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { db } from "@/lib/db";

export const revalidate = 3600;

/**
 * Sitemap.
 *
 * Database reads are wrapped: a sitemap that 500s because Postgres is briefly
 * unreachable is worse than one listing only static routes, since Google will
 * retry a 200 far more happily than an error.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${site.url}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/customize`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${site.url}/collections`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${site.url}/bulk`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/craft`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${site.url}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${site.url}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const [products, collections, posts] = await Promise.all([
      db.product.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
      db.collection.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
      db.post.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    return [
      ...staticRoutes,
      ...collections.map((c) => ({
        url: `${site.url}/collections/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...products.map((p) => ({
        url: `${site.url}/products/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...posts.map((p) => ({
        url: `${site.url}/journal/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    ];
  } catch (error) {
    console.error("[sitemap] database unavailable, serving static routes only", error);
    return staticRoutes;
  }
}
