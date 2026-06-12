import type { SupportTier } from "@/types/domain";

export type CairnPlanKey = "single_facility" | "multi_facility" | "enterprise";
export type CairnBillingFrequency = "monthly" | "annual";
export type CairnBillingStatus = "trialing" | "active" | "past_due" | "cancelled";
export type CairnTrialStatus = "trial" | "active" | "expired" | "not_applicable";

export type CairnSubscriptionSnapshot = {
  plan: CairnPlanKey;
  billingFrequency: CairnBillingFrequency;
  supportTier: SupportTier;
  billingStatus: CairnBillingStatus;
  trialStatus: CairnTrialStatus;
  renewalDate: string;
  facilitiesUsed: number;
  facilitiesIncluded: number | "unlimited";
};

export const pricingPrinciples = [
  "No seat limits",
  "No customer limits",
  "No household limits",
  "No transaction fees",
  "No feature gating",
  "No surprise fees"
];

export const cairnPricingPlans: Record<CairnPlanKey, {
  key: CairnPlanKey;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  annualNote: string;
  facilitiesIncluded: number | "unlimited";
  summary: string;
  includes: string[];
}> = {
  single_facility: {
    key: "single_facility",
    name: "Single Facility",
    monthlyPrice: "$149/month",
    annualPrice: "$1,490/year",
    annualNote: "Save approximately 17%",
    facilitiesIncluded: 1,
    summary: "For independent facilities running one location.",
    includes: [
      "One facility",
      "Unlimited staff accounts",
      "Unlimited customers",
      "Unlimited households",
      "Unlimited memberships",
      "Unlimited programs",
      "Unlimited communications",
      "Unlimited waivers",
      "Unlimited reports",
      "Customer portal",
      "Digital membership cards"
    ]
  },
  multi_facility: {
    key: "multi_facility",
    name: "Multi-Facility",
    monthlyPrice: "$299/month",
    annualPrice: "$2,990/year",
    annualNote: "Save approximately 17%",
    facilitiesIncluded: 5,
    summary: "For organizations operating multiple facilities.",
    includes: [
      "Everything in Single Facility",
      "Up to five facilities",
      "Cross-facility reporting",
      "Shared staff management",
      "Organization-wide administration"
    ]
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    monthlyPrice: "Starting at $599/month",
    annualPrice: "Starting at $5,990/year",
    annualNote: "Custom implementation scope",
    facilitiesIncluded: "unlimited",
    summary: "For larger networks and associations with hands-on support needs.",
    includes: [
      "Everything in Multi-Facility",
      "Unlimited facilities",
      "Dedicated onboarding",
      "Migration assistance",
      "Concierge support",
      "Custom implementation assistance"
    ]
  }
};

export const cairnSupportTiers: Record<SupportTier, {
  key: SupportTier;
  name: string;
  price: string;
  responseTarget: string;
  includes: string[];
}> = {
  standard: {
    key: "standard",
    name: "Standard Support",
    price: "Included",
    responseTarget: "Two business days",
    includes: ["Product support", "Documentation", "Standard ticket handling"]
  },
  priority: {
    key: "priority",
    name: "Priority Support",
    price: "$100/month or $1,000/year",
    responseTarget: "One business day",
    includes: ["Priority ticket routing", "Quarterly check-ins"]
  },
  concierge: {
    key: "concierge",
    name: "Concierge Support",
    price: "Custom pricing",
    responseTarget: "Mutually agreed support cadence",
    includes: ["Dedicated support contact", "Staff training", "Workflow consulting", "Migration assistance", "Implementation planning"]
  }
};

export function getPlanName(plan: CairnPlanKey) {
  return cairnPricingPlans[plan].name;
}

export function getSupportTierName(tier: SupportTier) {
  return cairnSupportTiers[tier].name;
}

export function formatFacilitiesIncluded(value: number | "unlimited") {
  return value === "unlimited" ? "Unlimited" : String(value);
}

export function getDemoSubscriptionForSlug(slug: string, facilitiesUsed = 1): CairnSubscriptionSnapshot {
  if (slug === "summit") {
    return {
      plan: "multi_facility",
      billingFrequency: "monthly",
      supportTier: "priority",
      billingStatus: "active",
      trialStatus: "active",
      renewalDate: "2026-07-01",
      facilitiesUsed,
      facilitiesIncluded: 5
    };
  }
  if (slug === "western-carolina-ymca") {
    return {
      plan: "enterprise",
      billingFrequency: "annual",
      supportTier: "concierge",
      billingStatus: "active",
      trialStatus: "active",
      renewalDate: "2027-01-01",
      facilitiesUsed,
      facilitiesIncluded: "unlimited"
    };
  }
  return {
    plan: "single_facility",
    billingFrequency: "annual",
    supportTier: "standard",
    billingStatus: "active",
    trialStatus: "active",
    renewalDate: "2027-05-10",
    facilitiesUsed,
    facilitiesIncluded: 1
  };
}

export function getDefaultTrialSubscription(facilitiesUsed = 1): CairnSubscriptionSnapshot {
  const now = new Date();
  const renewal = new Date(now);
  renewal.setDate(renewal.getDate() + 30);
  return {
    plan: "single_facility",
    billingFrequency: "monthly",
    supportTier: "standard",
    billingStatus: "trialing",
    trialStatus: "trial",
    renewalDate: renewal.toISOString().slice(0, 10),
    facilitiesUsed,
    facilitiesIncluded: 1
  };
}
