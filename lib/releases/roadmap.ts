export type RoadmapStatus = "Shipped" | "Planned" | "Future";

export type RoadmapMilestone = {
  versionRange: string;
  title: string;
  focus: string[];
  status: RoadmapStatus;
  criteria?: string[];
};

export const roadmapMilestones: RoadmapMilestone[] = [
  {
    versionRange: "v0.2.x",
    title: "Real Data Foundation",
    focus: [
      "Organizations",
      "Facilities",
      "Staff",
      "Customers",
      "Households",
      "Data classification"
    ],
    status: "Shipped"
  },
  {
    versionRange: "v0.3.x",
    title: "Customer Operations",
    focus: [
      "Customer CRUD",
      "Customer repository",
      "Neon-backed customer management",
      "Organization-scoped customer writes",
      "Customer Experience",
      "Neon-backed customer search",
      "Duplicate-customer warnings",
      "Profile clarity for persisted customer data",
      "Household CRUD",
      "Persisted customer-household relationships",
      "Primary-contact management",
      "Admin diagnostics",
      "Data-source migration",
      "Customer operations documentation",
      "Automated customer workflow coverage"
    ],
    status: "Shipped"
  },
  {
    versionRange: "v0.4.x",
    title: "Customer & Household Operations",
    focus: [
      "Customer imports",
      "Customer merge workflows",
      "Household imports",
      "Rich relationship roles",
      "Audit events"
    ],
    status: "Planned"
  },
  {
    versionRange: "v0.5.x",
    title: "Memberships & Check-In",
    focus: [
      "Membership persistence",
      "Check-ins",
      "Attendance"
    ],
    status: "Planned"
  },
  {
    versionRange: "v0.6.x",
    title: "Programs & Registrations",
    focus: [
      "Programs",
      "Sessions",
      "Registrations",
      "Waitlists"
    ],
    status: "Planned"
  },
  {
    versionRange: "v0.7.x",
    title: "Pilot Readiness",
    focus: [
      "Multi-facility testing",
      "Data validation",
      "Performance"
    ],
    status: "Planned"
  },
  {
    versionRange: "v1.0.0",
    title: "Production Ready",
    focus: [],
    criteria: [
      "Real customer deployments",
      "Documentation",
      "Stability",
      "Operational readiness"
    ],
    status: "Future"
  }
];
