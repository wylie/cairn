import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/metadata";
import { getPublicProgramSitemapEntries, getPublicSitemapOrganizationSlugs } from "@/lib/public-programs";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: absoluteUrl("/request-demo"),
      changeFrequency: "weekly",
      priority: 0.7
    },
    {
      url: absoluteUrl("/legal"),
      changeFrequency: "monthly",
      priority: 0.3
    }
  ];

  const publicOrgSlugs = getPublicSitemapOrganizationSlugs();

  const facilityEntries: MetadataRoute.Sitemap = publicOrgSlugs.map((orgSlug) => ({
    url: absoluteUrl(`/f/${orgSlug}`),
    changeFrequency: "weekly" as const,
    priority: 0.9
  }));

  const catalogEntries: MetadataRoute.Sitemap = publicOrgSlugs.map((orgSlug) => ({
    url: absoluteUrl(`/p/${orgSlug}/programs`),
    changeFrequency: "daily" as const,
    priority: 0.8
  }));

  const publicEntries = publicOrgSlugs.map((orgSlug) => getPublicProgramSitemapEntries(orgSlug));

  const programEntries: MetadataRoute.Sitemap = publicEntries.flatMap((entry) => entry.programs).map((url) => ({
      url,
      changeFrequency: "weekly" as const,
      priority: 0.7
    }));

  const sessionEntries: MetadataRoute.Sitemap = publicEntries.flatMap((entry) => entry.sessions).map((url) => ({
      url,
      changeFrequency: "daily" as const,
      priority: 0.6
    }));

  return [...staticEntries, ...facilityEntries, ...catalogEntries, ...programEntries, ...sessionEntries];
}
