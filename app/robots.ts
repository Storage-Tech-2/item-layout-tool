import type { MetadataRoute } from "next";

const DEFAULT_SITE_ORIGIN = "https://storage-tech-2.github.io";
export const dynamic = "force-static";

function normalizeBasePath(rawBasePath: string | undefined): string {
  if (!rawBasePath || rawBasePath === "/") {
    return "";
  }
  return `/${rawBasePath.replace(/^\/+|\/+$/g, "")}`;
}

export default function robots(): MetadataRoute.Robots {
  const siteOrigin = (process.env.NEXT_PUBLIC_SITE_ORIGIN ?? DEFAULT_SITE_ORIGIN).replace(/\/+$/g, "");
  const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
  const sitemapUrl = `${siteOrigin}${basePath}/sitemap.xml`;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: sitemapUrl,
    host: siteOrigin,
  };
}
