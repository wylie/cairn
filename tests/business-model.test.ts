import { describe, expect, it } from "vitest";
import {
  cairnPricingPlans,
  cairnSupportTiers,
  formatFacilitiesIncluded,
  getDemoSubscriptionForSlug,
  pricingPrinciples
} from "@/lib/business-model";

describe("Cairn business model", () => {
  it("documents pricing without feature or usage gating", () => {
    expect(cairnPricingPlans.single_facility.monthlyPrice).toBe("$149/month");
    expect(cairnPricingPlans.multi_facility.facilitiesIncluded).toBe(5);
    expect(cairnPricingPlans.enterprise.facilitiesIncluded).toBe("unlimited");
    expect(pricingPrinciples).toContain("No seat limits");
    expect(pricingPrinciples).toContain("No customer limits");
    expect(pricingPrinciples).toContain("No household limits");
    expect(pricingPrinciples).toContain("No transaction fees");
    expect(pricingPrinciples).toContain("No feature gating");
  });

  it("represents support tiers as operational relationships", () => {
    expect(cairnSupportTiers.standard.price).toBe("Included");
    expect(cairnSupportTiers.priority.responseTarget).toBe("One business day");
    expect(cairnSupportTiers.concierge.price).toBe("Custom pricing");
  });

  it("seeds realistic demo subscriptions", () => {
    expect(getDemoSubscriptionForSlug("summit", 2)).toMatchObject({
      plan: "multi_facility",
      billingFrequency: "monthly",
      supportTier: "priority",
      billingStatus: "active",
      trialStatus: "active",
      facilitiesUsed: 2,
      facilitiesIncluded: 5
    });
    expect(getDemoSubscriptionForSlug("riverbend", 1)).toMatchObject({
      plan: "single_facility",
      billingFrequency: "annual",
      supportTier: "standard",
      billingStatus: "active"
    });
    expect(getDemoSubscriptionForSlug("western-carolina-ymca", 12)).toMatchObject({
      plan: "enterprise",
      billingFrequency: "annual",
      supportTier: "concierge",
      facilitiesUsed: 12,
      facilitiesIncluded: "unlimited"
    });
    expect(formatFacilitiesIncluded("unlimited")).toBe("Unlimited");
  });
});
