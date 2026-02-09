import type { MetadataRoute } from "next";

const DEFAULT_SITE_ORIGIN = "https://storage-tech-2.github.io";
export const dynamic = "force-static";

function normalizeBasePath(rawBasePath: string | undefined): string {
  if (!rawBasePath || rawBasePath === "/") {
    return "";
  }
  return `/${rawBasePath.replace(/^\/+|\/+$/g, "")}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteOrigin = (process.env.NEXT_PUBLIC_SITE_ORIGIN ?? DEFAULT_SITE_ORIGIN).replace(/\/+$/g, "");
  const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
  const canonicalUrl = `${siteOrigin}${basePath}/`;

  return [
    {
      url: canonicalUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
