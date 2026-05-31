import { describe, expect, it } from "vitest";
import { metadata as publicMetadata } from "@/app/page";
import { metadata as loginMetadata } from "@/app/login/layout";
import { metadata as protectedMetadata } from "@/app/(app)/layout";
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
  });

  it("robots allows public and blocks protected routes", () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rules.allow).toContain("/");
    expect(rules.disallow).toContain("/login");
    expect(rules.disallow).toContain("/o/");
  });

  it("sitemap includes only public homepage", () => {
    const entries = sitemap();
    expect(entries).toHaveLength(1);
    expect(entries[0].url).toBe("https://cairn.example.com/");
  });
});
