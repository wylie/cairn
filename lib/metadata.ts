import type { Metadata } from "next";

export const SITE_URL = "https://stonecairn.app";
export const DEFAULT_SOCIAL_TITLE = "Cairn";
export const DEFAULT_SOCIAL_DESCRIPTION =
  "The operating system for modern recreation facilities. Manage memberships, check-ins, programs, households, waivers, and more in one place.";
export const DEFAULT_SOCIAL_IMAGE = "/images/og-default.png";
export const CAIRN_ICON_METADATA = {
  icon: [
    { url: "/favicon.svg", type: "image/svg+xml" },
    { url: "/favicon.ico", sizes: "any" }
  ],
  apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
} satisfies Metadata["icons"];

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}

type SocialMetadataOptions = {
  title?: string;
  description?: string;
  url?: string;
};

export function buildSocialMetadata({
  title = DEFAULT_SOCIAL_TITLE,
  description = DEFAULT_SOCIAL_DESCRIPTION,
  url = SITE_URL
}: SocialMetadataOptions = {}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName: DEFAULT_SOCIAL_TITLE,
      images: [
        {
          url: DEFAULT_SOCIAL_IMAGE,
          width: 1200,
          height: 630,
          alt: "Cairn - The operating system for modern recreation facilities."
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_SOCIAL_IMAGE]
    }
  };
}
