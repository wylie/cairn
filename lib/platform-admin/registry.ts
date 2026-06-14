import type { FacilityType, Organization, StaffPermission } from "@/types/domain";
import { getDefaultTrialSubscription, getDemoSubscriptionForSlug } from "@/lib/business-model";
import { organizations as seededOrganizations } from "@/lib/mocks/organizations";
import { locations as seededLocations } from "@/lib/mocks/locations";
import { staffUsers as seededStaffUsers } from "@/lib/mocks/staff";
import { customers as seededCustomers } from "@/lib/mocks/customers";

export const ORG_REGISTRY_COOKIE = "cairn_org_registry";
export const ORG_REGISTRY_STORAGE_KEY = "cairn_platform_org_registry";

export type PlatformOrganizationStatus = "active" | "trial" | "suspended" | "archived";
export type ProvisioningFacilityType =
  | "Recreation Center"
  | "YMCA"
  | "Climbing Gym"
  | "Camp"
  | "Outdoor Center"
  | "Yoga Studio"
  | "Fitness Facility"
  | "Bike Park"
  | "Community Center"
  | "Custom";

export interface RuntimeOrganizationRecord extends Organization {
  status: PlatformOrganizationStatus;
  createdAt: string;
  lastActivityAt?: string;
  description?: string;
  primaryColor?: string;
  secondaryColor?: string;
  seoTitle?: string;
  seoDescription?: string;
  isDemo?: boolean;
  isReadOnlyDemo?: boolean;
  isResettableDemo?: boolean;
}

export interface OrganizationTemplateRecord {
  id: string;
  name: string;
  facilityType: ProvisioningFacilityType;
  description: string;
  starterProducts: string[];
  starterWaivers: string[];
  dashboardWidgets: string[];
  reports: string[];
  defaultPermissions: StaffPermission[];
}

export interface ProvisionedOrganizationRecord extends RuntimeOrganizationRecord {
  templateId: string;
  primaryLocationName: string;
  ownerName: string;
  ownerEmail: string;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logoText: string;
  };
  generatedAssets: {
    staffPortal: string;
    customerPortal: string;
    facilityLandingPage: string;
    settingsPath: string;
  };
  stats: {
    locations: number;
    members: number;
    staff: number;
  };
  starterData: {
    roles: string[];
    waivers: string[];
    products: string[];
    dashboardWidgets: string[];
    reports: string[];
  };
}

const DEFAULT_TEMPLATE_PERMISSIONS: StaffPermission[] = [
  "viewCustomers",
  "checkInCustomer",
  "checkOutCustomer",
  "manageProducts",
  "manageWaivers",
  "viewReports",
  "viewAttendanceReports",
  "viewFinancialReports",
  "usePOS",
  "editPrograms",
  "manageCommunications",
  "sendTransactionalMessages",
  "messageAssignedParticipants",
  "manageSettings",
  "manageStaff",
  "manageRoles"
];

export const PLATFORM_TEMPLATES: OrganizationTemplateRecord[] = [
  {
    id: "tpl_ymca",
    name: "YMCA Template",
    facilityType: "YMCA",
    description: "Membership, family programming, wellness, and youth operations defaults.",
    starterProducts: ["Day Pass", "Monthly Membership", "Annual Membership"],
    starterWaivers: ["General Liability Waiver", "Youth Program Waiver"],
    dashboardWidgets: ["Occupancy", "Membership Health", "Program Health", "Household Health"],
    reports: ["Revenue", "Attendance", "Membership Growth", "Household Revenue"],
    defaultPermissions: DEFAULT_TEMPLATE_PERMISSIONS
  },
  {
    id: "tpl_climbing",
    name: "Climbing Gym Template",
    facilityType: "Climbing Gym",
    description: "Check-in, waivers, memberships, lessons, and retail defaults for climbing facilities.",
    starterProducts: ["Day Pass", "Monthly Membership", "Annual Membership", "Rental Package"],
    starterWaivers: ["General Liability Waiver", "Climbing Waiver"],
    dashboardWidgets: ["Occupancy", "Waiver Health", "Top Visitors", "Retail Snapshot"],
    reports: ["Revenue", "Attendance", "Waiver Compliance", "Top Visiting Households"],
    defaultPermissions: DEFAULT_TEMPLATE_PERMISSIONS
  },
  {
    id: "tpl_camp",
    name: "Camp Template",
    facilityType: "Camp",
    description: "Program registrations, guardian waivers, and seasonal camp operations defaults.",
    starterProducts: ["Day Pass", "Camp Registration", "Family Membership"],
    starterWaivers: ["General Liability Waiver", "Camp Waiver", "Photo Release"],
    dashboardWidgets: ["Program Health", "Waiver Health", "Household Health", "Staff Activity"],
    reports: ["Attendance", "Program Fill Rate", "Household Retention", "Revenue"],
    defaultPermissions: DEFAULT_TEMPLATE_PERMISSIONS
  },
  {
    id: "tpl_rec_center",
    name: "Rec Center Template",
    facilityType: "Recreation Center",
    description: "General recreation operations with households, passes, and facility access defaults.",
    starterProducts: ["Day Pass", "Monthly Membership", "Punch Pass"],
    starterWaivers: ["General Liability Waiver"],
    dashboardWidgets: ["Occupancy", "Household Health", "Customer Activity", "Financial Snapshot"],
    reports: ["Attendance", "Revenue", "Household Growth", "Membership Health"],
    defaultPermissions: DEFAULT_TEMPLATE_PERMISSIONS
  },
  {
    id: "tpl_outdoor",
    name: "Outdoor Center Template",
    facilityType: "Outdoor Center",
    description: "Outdoor programming, seasonal passes, equipment rental, and waiver defaults.",
    starterProducts: ["Day Pass", "Season Pass", "Rental Package"],
    starterWaivers: ["General Liability Waiver", "Outdoor Activity Waiver"],
    dashboardWidgets: ["Program Health", "Waiver Health", "Inventory Alerts", "Staff Activity"],
    reports: ["Revenue", "Attendance", "Waiver Compliance", "Program Utilization"],
    defaultPermissions: DEFAULT_TEMPLATE_PERMISSIONS
  }
];

function mapProvisioningFacilityType(facilityType: ProvisioningFacilityType): FacilityType {
  switch (facilityType) {
    case "Climbing Gym":
      return "climbing";
    case "Camp":
      return "camp";
    case "Yoga Studio":
      return "yoga";
    case "Fitness Facility":
      return "fitness";
    case "Bike Park":
      return "bike_park";
    default:
      return "hybrid";
  }
}

export function inferTemplateForFacilityType(facilityType: ProvisioningFacilityType) {
  return (
    PLATFORM_TEMPLATES.find((template) => template.facilityType === facilityType) ??
    PLATFORM_TEMPLATES.find((template) => template.facilityType === "Recreation Center")!
  );
}

export function slugifyOrganizationName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildSeedProvisionedOrganizations(): ProvisionedOrganizationRecord[] {
  const seeded = seededOrganizations.map((organization) => {
    const orgLocations = seededLocations.filter((location) => location.organizationId === organization.id);
    const orgStaff = seededStaffUsers.filter((staff) => staff.organizationId === organization.id);
    const orgCustomers = seededCustomers.filter((customer) => customer.organizationId === organization.id);
    const slug = organization.slug === "riverbend" ? "riverbend" : organization.slug;
    const subscription = getDemoSubscriptionForSlug(slug, orgLocations.length);
    const template =
      organization.slug === "riverbend"
        ? inferTemplateForFacilityType("Camp")
        : inferTemplateForFacilityType("Climbing Gym");
    const displayName = organization.slug === "riverbend" ? "Riverstone Nature Center" : organization.name;
    return {
      ...organization,
      name: displayName,
      status: "active" as const,
      createdAt: organization.slug === "riverbend" ? "2026-05-10T09:00:00Z" : "2026-04-01T09:00:00Z",
      lastActivityAt: organization.slug === "riverbend" ? "2026-06-06T16:45:00Z" : "2026-06-07T14:10:00Z",
      description:
        organization.slug === "riverbend"
          ? "Nature center and outdoor education organization used for program and rental operations demos."
          : "Modern hybrid recreation facility used as the primary Cairn demo organization.",
      primaryColor: organization.slug === "riverbend" ? "#2563EB" : "#0E9AC8",
      secondaryColor: organization.slug === "riverbend" ? "#1E3A8A" : "#1F2937",
      seoTitle: `${displayName} | Cairn Facility Portal`,
      seoDescription: `Customer and staff access for ${displayName}.`,
      ...subscription,
      subscriptionPlan: subscription.plan,
      isDemo: true,
      isReadOnlyDemo: organization.slug === "riverbend",
      isResettableDemo: true,
      templateId: template.id,
      primaryLocationName: orgLocations[0]?.name ?? "Main Location",
      ownerName: orgStaff[0] ? `${orgStaff[0].firstName} ${orgStaff[0].lastName}` : "Owner",
      ownerEmail: orgStaff[0]?.email ?? "owner@example.com",
      branding: {
        primaryColor: organization.slug === "riverbend" ? "#2563EB" : "#0E9AC8",
        secondaryColor: organization.slug === "riverbend" ? "#1E3A8A" : "#1F2937",
        logoText: displayName
          .split(" ")
          .slice(0, 2)
          .map((chunk) => chunk[0])
          .join("")
          .toUpperCase()
      },
      generatedAssets: {
        staffPortal: `/o/${organization.slug}`,
        customerPortal: `/p/${organization.slug}`,
        facilityLandingPage: `/f/${organization.slug}`,
        settingsPath: `/o/${organization.slug}/settings`
      },
      stats: {
        locations: orgLocations.length,
        members: orgCustomers.length,
        staff: orgStaff.length
      },
      starterData: {
        roles: ["Owner", "Manager", "Front Desk", "Instructor", "Staff"],
        waivers: template.starterWaivers,
        products: template.starterProducts,
        dashboardWidgets: template.dashboardWidgets,
        reports: template.reports
      }
    };
  });
  const westernSubscription = getDemoSubscriptionForSlug("western-carolina-ymca", 12);
  const westernTemplate = inferTemplateForFacilityType("YMCA");
  return [
    ...seeded,
    {
      id: "org_western_carolina_ymca",
      slug: "western-carolina-ymca",
      name: "Western Carolina YMCA Association",
      facilityType: "hybrid",
      timezone: "America/New_York",
      status: "active" as const,
      createdAt: "2026-02-15T09:00:00Z",
      lastActivityAt: "2026-06-07T17:20:00Z",
      description: "Regional YMCA association demo showing enterprise facilities, shared administration, and concierge support.",
      primaryColor: "#0E9AC8",
      secondaryColor: "#1F2937",
      seoTitle: "Western Carolina YMCA Association | Cairn Facility Portal",
      seoDescription: "Customer and staff access for Western Carolina YMCA Association.",
      ...westernSubscription,
      subscriptionPlan: westernSubscription.plan,
      isDemo: true,
      isReadOnlyDemo: true,
      isResettableDemo: true,
      templateId: westernTemplate.id,
      primaryLocationName: "Western Carolina YMCA Main Branch",
      ownerName: "Jordan Ellis",
      ownerEmail: "jordan@westerncarolinaymca.example",
      branding: {
        primaryColor: "#0E9AC8",
        secondaryColor: "#1F2937",
        logoText: "WC"
      },
      generatedAssets: {
        staffPortal: "/o/western-carolina-ymca",
        customerPortal: "/p/western-carolina-ymca",
        facilityLandingPage: "/f/western-carolina-ymca",
        settingsPath: "/o/western-carolina-ymca/settings"
      },
      stats: {
        locations: 12,
        members: 18420,
        staff: 312
      },
      starterData: {
        roles: ["Owner", "Manager", "Front Desk", "Instructor", "Staff"],
        waivers: westernTemplate.starterWaivers,
        products: westernTemplate.starterProducts,
        dashboardWidgets: westernTemplate.dashboardWidgets,
        reports: westernTemplate.reports
      }
    }
  ];
}

export function buildProvisionedOrganization(input: {
  name: string;
  slug: string;
  facilityType: ProvisioningFacilityType;
  primaryLocationName: string;
  ownerName: string;
  ownerEmail: string;
  primaryColor: string;
  secondaryColor: string;
  description?: string;
}) {
  const template = inferTemplateForFacilityType(input.facilityType);
  const id = `org_${input.slug.replace(/-/g, "_")}`;
  const subscription = getDefaultTrialSubscription(1);
  return {
    id,
    slug: input.slug,
    name: input.name,
    facilityType: mapProvisioningFacilityType(input.facilityType),
    timezone: "America/New_York",
    status: "trial" as const,
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    description: input.description?.trim() || `${input.name} provisioned from the ${template.name}.`,
    primaryColor: input.primaryColor,
    secondaryColor: input.secondaryColor,
    seoTitle: `${input.name} | Cairn Facility Portal`,
    seoDescription: `${input.name} customer and staff portals provisioned with Cairn.`,
    ...subscription,
    subscriptionPlan: subscription.plan,
    templateId: template.id,
    primaryLocationName: input.primaryLocationName,
    ownerName: input.ownerName,
    ownerEmail: input.ownerEmail,
    branding: {
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      logoText: input.name
        .split(" ")
        .slice(0, 2)
        .map((chunk) => chunk[0])
        .join("")
        .toUpperCase()
    },
    generatedAssets: {
      staffPortal: `/o/${input.slug}`,
      customerPortal: `/p/${input.slug}`,
      facilityLandingPage: `/f/${input.slug}`,
      settingsPath: `/o/${input.slug}/settings`
    },
    stats: {
      locations: 1,
      members: 0,
      staff: 1
    },
    starterData: {
      roles: ["Owner", "Manager", "Front Desk", "Instructor", "Staff"],
      waivers: template.starterWaivers,
      products: template.starterProducts,
      dashboardWidgets: template.dashboardWidgets,
      reports: template.reports
    }
  } satisfies ProvisionedOrganizationRecord;
}

export function parseProvisionedOrganizations(raw: string | undefined | null) {
  if (!raw) return [] as ProvisionedOrganizationRecord[];
  try {
    const parsed = JSON.parse(raw) as ProvisionedOrganizationRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => Boolean(entry?.id && entry?.slug && entry?.name));
  } catch {
    return [];
  }
}

export function mergeProvisionedOrganizations(organizations: ProvisionedOrganizationRecord[]) {
  const merged = new Map<string, ProvisionedOrganizationRecord>();
  // Seeded demo identities are canonical. Browser storage may contain stale demo
  // names from an earlier release, but custom provisioned organizations remain intact.
  for (const entry of [...organizations, ...buildSeedProvisionedOrganizations()]) {
    merged.set(entry.slug, entry);
  }
  return Array.from(merged.values());
}

export function readProvisionedOrganizationsClient() {
  if (typeof document === "undefined") return buildSeedProvisionedOrganizations();
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${ORG_REGISTRY_COOKIE}=`))
    ?.split("=")[1];
  const rawCookie = cookie ? decodeURIComponent(cookie) : null;
  const rawStorage = typeof window !== "undefined" ? window.localStorage.getItem(ORG_REGISTRY_STORAGE_KEY) : null;
  return mergeProvisionedOrganizations([
    ...parseProvisionedOrganizations(rawCookie),
    ...parseProvisionedOrganizations(rawStorage)
  ]);
}

export function getRuntimeOrganizationsClient() {
  return readProvisionedOrganizationsClient();
}

export function writeProvisionedOrganizationsClient(organizations: ProvisionedOrganizationRecord[]) {
  if (typeof document === "undefined") return;
  const serialized = JSON.stringify(organizations);
  document.cookie = `${ORG_REGISTRY_COOKIE}=${encodeURIComponent(serialized)}; path=/; samesite=lax`;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ORG_REGISTRY_STORAGE_KEY, serialized);
  }
}

export function parseProvisionedOrganizationsFromRequestCookie(raw: string | undefined | null) {
  return mergeProvisionedOrganizations(parseProvisionedOrganizations(raw));
}

export function resolveRuntimeOrganizationBySlugClient(slug: string) {
  return readProvisionedOrganizationsClient().find((entry) => entry.slug === slug) ?? null;
}
