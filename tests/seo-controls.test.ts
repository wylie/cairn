import { describe, expect, it } from "vitest";
import { metadata as rootMetadata } from "@/app/layout";
import manifest from "@/app/manifest";
import { metadata as publicMetadata } from "@/app/page";
import { metadata as loginMetadata } from "@/app/login/layout";
import { metadata as protectedMetadata } from "@/app/(app)/layout";
import { metadata as customerAccountMetadata } from "@/app/p/[orgSlug]/account/layout";
import { CAIRN_ICON_METADATA } from "@/lib/metadata";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("SEO controls", () => {
  it("defines global social sharing metadata and home screen assets", () => {
    expect(rootMetadata.openGraph?.title).toBe("Cairn");
    expect(rootMetadata.openGraph?.type).toBe("website");
    expect(rootMetadata.openGraph?.url).toBe("https://stonecairn.app");
    expect(rootMetadata.openGraph?.images).toEqual(
      expect.arrayContaining([expect.objectContaining({ url: "/images/og-default.png", width: 1200, height: 630 })])
    );
    expect(rootMetadata.twitter?.card).toBe("summary_large_image");
    expect(rootMetadata.icons).toBe(CAIRN_ICON_METADATA);
    expect(rootMetadata.icons).toEqual(
      expect.objectContaining({
        icon: [
          expect.objectContaining({ url: "/favicon.svg", type: "image/svg+xml" }),
          expect.objectContaining({ url: "/favicon.ico", sizes: "any" })
        ],
        apple: [expect.objectContaining({ url: "/icons/apple-touch-icon.png", sizes: "180x180" })]
      })
    );
  });

  it("defines a standalone web app manifest with mobile icons", () => {
    const config = manifest();
    expect(config).toEqual(
      expect.objectContaining({
        name: "Cairn",
        short_name: "Cairn",
        display: "standalone",
        theme_color: "#0693C2",
        background_color: "#F8FAFC"
      })
    );
    expect(config.icons).toEqual([
      expect.objectContaining({ src: "/icons/icon-192.png", sizes: "192x192" }),
      expect.objectContaining({ src: "/icons/icon-512.png", sizes: "512x512" })
    ]);
  });

  it("public homepage has SEO metadata", () => {
    expect(publicMetadata.title).toBe("Cairn | Facility Operations Software");
    expect(publicMetadata.description).toMatch(/Modern facility operations software/i);
    expect(publicMetadata.manifest).toBe("/manifest.webmanifest");
    expect(publicMetadata.icons).toBe(CAIRN_ICON_METADATA);
    expect(publicMetadata.openGraph?.title).toBe("Cairn | Facility Operations Software");
    expect(publicMetadata.openGraph?.images).toEqual(
      expect.arrayContaining([expect.objectContaining({ url: "/images/og-default.png" })])
    );
    expect(publicMetadata.twitter?.card).toBe("summary_large_image");
  });

  it("login and protected layouts are noindex", () => {
    expect(loginMetadata.robots).toEqual({ index: false, follow: false });
    expect(protectedMetadata.robots).toEqual({ index: false, follow: false });
    expect(customerAccountMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("robots allows public and blocks protected routes", () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rules.allow).toContain("/");
    expect(rules.allow).toContain("/request-demo");
    expect(rules.allow).toContain("/f/");
    expect(rules.allow).toContain("/p/*/programs");
    expect(rules.allow).toContain("/p/*/sessions");
    expect(rules.disallow).toContain("/admin/*");
    expect(rules.disallow).toContain("/api/*");
    expect(rules.disallow).toContain("/login");
    expect(rules.disallow).toContain("/o/");
    expect(rules.disallow).toContain("/p/*/login");
    expect(rules.disallow).toContain("/p/*/account/");
    expect(rules.disallow).toContain("/customers/*");
    expect(rules.disallow).toContain("/households/*");
    expect(config.sitemap).toBe("https://stonecairn.app/sitemap.xml");
  });

  it("sitemap includes only public marketing and program discovery pages", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain("https://stonecairn.app/");
    expect(urls).toContain("https://stonecairn.app/request-demo");
    expect(urls).toContain("https://stonecairn.app/legal");
    expect(urls).toContain("https://stonecairn.app/f/summit");
    expect(urls).toContain("https://stonecairn.app/f/riverbend");
    expect(urls).toContain("https://stonecairn.app/p/summit/programs");
    expect(urls).toContain("https://stonecairn.app/p/riverbend/programs");
    expect(urls.some((url) => url.includes("/account/"))).toBe(false);
    expect(urls.some((url) => url.includes("/admin"))).toBe(false);
    expect(urls.some((url) => url.includes("/api/"))).toBe(false);
    expect(urls.some((url) => url.includes("/customers/"))).toBe(false);
    expect(urls.some((url) => url.includes("cairn.example.com"))).toBe(false);
  });
});
