import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/login", "/o/"]
      }
    ],
    sitemap: "https://cairn.example.com/sitemap.xml"
  };
}
