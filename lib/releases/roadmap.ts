export type RoadmapStatus = "In Progress" | "Planned" | "Future";

export type RoadmapRelease = {
  version: string;
  title: string;
  target: string;
  focus: string[];
  status: RoadmapStatus;
  criteria?: string[];
};

export const roadmapReleases: RoadmapRelease[] = [
  {
    version: "0.1.0",
    title: "Pilot Readiness",
    target: "June 22, 2026",
    focus: [
      "Branding",
      "Documentation",
      "Release Notes",
      "Versioning",
      "Support infrastructure",
      "Navigation improvements",
      "Demo readiness"
    ],
    status: "In Progress"
  },
  {
    version: "0.2.0",
    title: "Feedback & Usability",
    target: "June 29, 2026",
    focus: [
      "Tester feedback",
      "Workflow refinement",
      "UI consistency",
      "Accessibility improvements",
      "Notification improvements",
      "Demo environment improvements"
    ],
    status: "Planned"
  },
  {
    version: "0.3.0",
    title: "Customer Migration & Onboarding",
    target: "July 6, 2026",
    focus: [
      "Customer import",
      "Household import",
      "Membership import",
      "Import validation",
      "Guided onboarding",
      "Migration documentation"
    ],
    status: "Planned"
  },
  {
    version: "0.4.0",
    title: "Operations & Staff Experience",
    target: "July 13, 2026",
    focus: [
      "Staff workflow improvements",
      "Operational alerts",
      "Reporting enhancements",
      "Staff productivity tools"
    ],
    status: "Planned"
  },
  {
    version: "0.5.0",
    title: "Pilot Customer Release",
    target: "July 20, 2026",
    focus: [
      "Real facility onboarding",
      "Support workflow maturity",
      "Billing readiness",
      "Remaining operational gaps"
    ],
    status: "Planned"
  },
  {
    version: "0.6.0",
    title: "Mobile & Member Experience",
    target: "July 27, 2026",
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
    target: "TBD",
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
