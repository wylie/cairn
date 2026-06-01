import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/login", "/o/", "/p/login", "/p/"]
      }
    ],
    sitemap: "https://cairn.example.com/sitemap.xml"
  };
}
