import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://cairn.example.com/",
      changeFrequency: "weekly",
      priority: 1
    }
  ];
}
