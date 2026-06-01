import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/p/*/programs", "/p/*/programs/", "/p/*/sessions", "/p/*/sessions/"],
        disallow: ["/login", "/o/", "/p/login", "/p/*/account/", "/p/*/dashboard", "/p/*/memberships", "/p/*/registrations", "/p/*/waivers", "/p/*/household", "/p/*/visits", "/p/*/purchases", "/p/*/facility"]
      }
    ],
    sitemap: "https://cairn.example.com/sitemap.xml"
  };
}
