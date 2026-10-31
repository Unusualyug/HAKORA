import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  let services: { slug: string; updatedAt: Date }[] = [];
  try {
    services = await prisma.service.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });
  } catch {
    /* db unavailable at build time */
  }
  const staticPages = [
    "",
    "/about",
    "/services",
    "/contact",
    "/submit-requirement",
    "/privacy-policy",
    "/terms-and-conditions",
    "/refund-policy",
  ];
  return [
    ...staticPages.map((p) => ({
      url: `${base}${p}`,
      lastModified: new Date(),
      priority: p === "" ? 1 : 0.7,
    })),
    ...services.map((s) => ({
      url: `${base}/services/${s.slug}`,
      lastModified: s.updatedAt,
      priority: 0.6,
    })),
  ];
}
