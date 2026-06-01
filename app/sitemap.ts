import type { MetadataRoute } from "next";
import { getPublicProgramSitemapEntries } from "@/lib/public-programs";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: "https://cairn.example.com/",
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: "https://cairn.example.com/p/summit/programs",
      changeFrequency: "daily",
      priority: 0.8
    }
  ];

  const publicEntries = getPublicProgramSitemapEntries("summit");

  const programEntries: MetadataRoute.Sitemap = publicEntries.programs.map((url) => ({
      url,
      changeFrequency: "weekly" as const,
      priority: 0.7
    }));

  const sessionEntries: MetadataRoute.Sitemap = publicEntries.sessions.map((url) => ({
      url,
      changeFrequency: "daily" as const,
      priority: 0.6
    }));

  return [...staticEntries, ...programEntries, ...sessionEntries];
}
