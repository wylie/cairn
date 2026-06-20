export type RoadmapStatus = "Released" | "In Progress" | "Planned" | "Future";

export type RoadmapCategory = {
  title: string;
  focus: string[];
};

export type RoadmapRelease = {
  version: string;
  title: string;
  target: string;
  focus?: string[];
  categories?: RoadmapCategory[];
  status: RoadmapStatus;
  criteria?: string[];
};

export const roadmapReleases: RoadmapRelease[] = [
  {
    version: "0.2.0",
    title: "Real Data Foundation",
    target: "June 29, 2026",
    focus: [
      "Real Data Foundation Planning complete",
      "Database Foundation complete",
      "Organization Persistence complete",
      "Facility Persistence complete",
      "Data Classification Layer complete",
      "Staff Accounts Foundation in progress",
      "Customer & Household Foundation in progress",
      "Neon PostgreSQL",
      "Drizzle ORM",
      "Organization data model",
      "Facility data model",
      "Staff data model",
      "Customer data model",
      "Household data model",
      "Tenant boundary rules",
      "localStorage-to-database migration path"
    ],
    status: "In Progress"
  },
  {
    version: "0.1.0",
    title: "Pilot Readiness Release",
    target: "June 22, 2026",
    categories: [
      {
        title: "Platform Foundation",
        focus: [
          "Release Notes",
          "Product Roadmap",
          "Versioning",
          "Weekly Release Process",
          "Update Notifications",
          "Support Console Foundation"
        ]
      },
      {
        title: "Branding & Marketing",
        focus: [
          "Stone Cairn branding",
          "Logo system",
          "Favicon support",
          "OG/social sharing metadata",
          "Marketing site improvements",
          "Pricing model",
          "Support model"
        ]
      },
      {
        title: "Facility Operations",
        focus: [
          "Customer management",
          "Household management",
          "Membership management",
          "Check-in workflows",
          "POS workflows",
          "Programs",
          "Registrations",
          "Rentals",
          "Reporting dashboards"
        ]
      },
      {
        title: "Demo & Testing Readiness",
        focus: [
          "Demo organizations",
          "Demo staff accounts",
          "Demo customer accounts",
          "Documentation improvements",
          "Tester onboarding materials",
          "Facility-specific login experience"
        ]
      },
      {
        title: "UX Improvements",
        focus: [
          "Navigation organization",
          "Sidebar scrolling fixes",
          "Notification improvements",
          "Read/unread notification states",
          "Notification ordering",
          "Active navigation fixes",
          "Dropdown usability improvements",
          "Loading-state improvements"
        ]
      },
      {
        title: "Reliability & Quality",
        focus: [
          "Hydration fixes",
          "Route cleanup",
          "Permission cleanup",
          "Support access model",
          "Documentation restructuring"
        ]
      },
      {
        title: "Pilot Program",
        focus: [
          "External tester onboarding",
          "Feedback collection",
          "In-app support requests",
          "Bug reporting workflow",
          "Weekly release cadence"
        ]
      }
    ],
    status: "Released"
  },
  {
    version: "0.3.0",
    title: "Feedback & Usability",
    target: "July 6, 2026",
    focus: [
      "Tester feedback",
      "Workflow refinements",
      "UI consistency",
      "Accessibility improvements",
      "Demo environment improvements"
    ],
    status: "Planned"
  },
  {
    version: "0.4.0",
    title: "Customer Migration & Onboarding",
    target: "July 13, 2026",
    focus: [
      "Customer imports",
      "Household imports",
      "Membership imports",
      "Validation workflows",
      "Guided onboarding"
    ],
    status: "Planned"
  },
  {
    version: "0.5.0",
    title: "Operations & Staff Experience",
    target: "July 20, 2026",
    focus: [
      "Staff workflow improvements",
      "Operational alerts",
      "Reporting enhancements",
      "Staff productivity tools"
    ],
    status: "Planned"
  },
  {
    version: "0.6.0",
    title: "Pilot Customer Release",
    target: "July 27, 2026",
    focus: [
      "Real facility onboarding",
      "Support workflow maturity",
      "Billing readiness",
      "Remaining operational gaps"
    ],
    status: "Planned"
  },
  {
    version: "0.7.0",
    title: "Mobile & Member Experience",
    target: "TBD",
    focus: [
      "Digital membership cards",
      "Apple Wallet research",
      "Google Wallet research",
      "Customer portal enhancements",
      "Mobile experience improvements"
    ],
    status: "Planned"
  },
  {
    version: "1.0.0",
    title: "Production Ready",
    target: "Criteria-driven",
    focus: [],
    criteria: [
      "Successful pilot facility",
      "Stable onboarding",
      "Stable imports",
      "Stable billing",
      "Stable support process",
      "No critical workflow gaps"
    ],
    status: "Future"
  }
];
