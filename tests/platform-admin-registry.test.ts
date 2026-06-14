import { describe, expect, it } from "vitest";
import {
  buildProvisionedOrganization,
  buildSeedProvisionedOrganizations,
  mergeProvisionedOrganizations,
  parseProvisionedOrganizations
} from "@/lib/platform-admin/registry";

describe("platform admin registry", () => {
  it("builds a provisioned organization with generated assets and starter data", () => {
    const record = buildProvisionedOrganization({
      name: "North Ridge Camp",
      slug: "north-ridge",
      facilityType: "Camp",
      primaryLocationName: "North Ridge Base",
      ownerName: "Taylor Reed",
      ownerEmail: "taylor@northridge.example.com",
      primaryColor: "#0E9AC8",
      secondaryColor: "#1F2937",
      description: "Seasonal camp facility."
    });

    expect(record.generatedAssets.staffPortal).toBe("/o/north-ridge");
    expect(record.generatedAssets.customerPortal).toBe("/p/north-ridge");
    expect(record.generatedAssets.facilityLandingPage).toBe("/f/north-ridge");
    expect(record.starterData.roles).toEqual(["Owner", "Manager", "Front Desk", "Instructor", "Staff"]);
    expect(record.starterData.waivers.length).toBeGreaterThan(0);
    expect(record.templateId).toBe("tpl_camp");
  });

  it("merges seeded and provisioned organizations by slug", () => {
    const seeded = buildSeedProvisionedOrganizations();
    const extra = buildProvisionedOrganization({
      name: "Peak Yoga Studio",
      slug: "peak-yoga",
      facilityType: "Yoga Studio",
      primaryLocationName: "Peak Main",
      ownerName: "Mara West",
      ownerEmail: "mara@peak.example.com",
      primaryColor: "#7C3AED",
      secondaryColor: "#1F2937",
      description: ""
    });

    const merged = mergeProvisionedOrganizations([...seeded, extra]);
    expect(merged.some((entry) => entry.slug === "summit")).toBe(true);
    expect(merged.some((entry) => entry.slug === "peak-yoga")).toBe(true);
    expect(merged.filter((entry) => entry.slug === "summit")).toHaveLength(1);
  });

  it("rejects malformed registry payloads", () => {
    expect(parseProvisionedOrganizations("not-json")).toEqual([]);
    expect(parseProvisionedOrganizations(JSON.stringify([{ bad: true }]))).toEqual([]);
  });

  it("keeps seeded demo identities canonical when browser data is stale", () => {
    const riverstone = buildSeedProvisionedOrganizations().find((entry) => entry.slug === "riverbend")!;
    const merged = mergeProvisionedOrganizations([
      { ...riverstone, name: "Riverbend Recreation Collective" }
    ]);

    expect(merged.find((entry) => entry.slug === "riverbend")?.name).toBe("Riverstone Nature Center");
  });
});
