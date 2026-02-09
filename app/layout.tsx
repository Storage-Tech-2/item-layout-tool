import type { Metadata } from "next";
import "./globals.css";

const DEFAULT_SITE_ORIGIN = "https://storage-tech-2.github.io";
const SITE_NAME = "Minecraft Item Layout Tool";
const SITE_DESCRIPTION =
  "Design your very own Minecraft storage layout with visual item assignment and export tools.";
const SOCIAL_IMAGE_WIDTH = 3024;
const SOCIAL_IMAGE_HEIGHT = 1514;

function normalizeBasePath(rawBasePath: string | undefined): string {
  if (!rawBasePath || rawBasePath === "/") {
    return "";
  }
  return `/${rawBasePath.replace(/^\/+|\/+$/g, "")}`;
}

const siteOrigin = (process.env.NEXT_PUBLIC_SITE_ORIGIN ?? DEFAULT_SITE_ORIGIN).replace(/\/+$/g, "");
const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
const canonicalPath = basePath ? `${basePath}/` : "/";
const socialImagePath = basePath ? `${basePath}/layout_tool.webp` : "/layout_tool.webp";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Minecraft",
    "storage layout",
    "item sorter",
    "layout planner",
    "litematic",
    "warehouse planning",
  ],
  alternates: {
    canonical: canonicalPath,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: canonicalPath,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: socialImagePath,
        width: SOCIAL_IMAGE_WIDTH,
        height: SOCIAL_IMAGE_HEIGHT,
        alt: "Minecraft Item Layout Tool interface preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [socialImagePath],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
