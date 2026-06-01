import { describe, expect, it } from "vitest";
import { metadata as publicMetadata } from "@/app/page";
import { metadata as loginMetadata } from "@/app/login/layout";
import { metadata as protectedMetadata } from "@/app/(app)/layout";
import { metadata as customerAccountMetadata } from "@/app/p/[orgSlug]/account/layout";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("SEO controls", () => {
  it("public homepage has SEO metadata", () => {
    expect(publicMetadata.title).toBe("Cairn | Facility Operations Software");
    expect(publicMetadata.description).toMatch(/Modern facility operations software/i);
    expect(publicMetadata.openGraph?.title).toBe("Cairn | Facility Operations Software");
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
    expect(rules.allow).toContain("/f/");
    expect(rules.disallow).toContain("/login");
    expect(rules.disallow).toContain("/o/");
    expect(rules.disallow).toContain("/p/*/login");
    expect(rules.disallow).toContain("/p/*/account/");
  });

  it("sitemap includes only public marketing and program discovery pages", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain("https://cairn.example.com/");
    expect(urls).toContain("https://cairn.example.com/f/summit");
    expect(urls).toContain("https://cairn.example.com/p/summit/programs");
    expect(urls.some((url) => url.includes("/account/"))).toBe(false);
  });
});
