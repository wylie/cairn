import { version } from "@/lib/version";

export type ReleaseNoteSection = "added" | "improved" | "fixed" | "changed" | "knownIssues";

export type ReleaseNote = {
  version: string;
  releaseName: string;
  releaseDate: string;
  releaseType: "patch" | "minor" | "major";
  summary: string;
  sections: Record<ReleaseNoteSection, string[]>;
};

const realDataFoundationRelease: ReleaseNote = {
  version: "0.2.0",
  releaseName: "Real Data Foundation",
  releaseDate: "2026-06-29",
  releaseType: "minor",
  summary: "Initial real database foundation using Neon.",
  sections: {
    added: [
      "Neon database integration",
      "Drizzle ORM foundation",
      "Initial database schema",
      "Migration infrastructure",
      "Database health monitoring",
      "Organization schema",
      "Facility schema",
      "Staff database model",
      "Customer schema",
      "Household schema",
      "Seed data for organizations, facilities, staff, customers, and households",
      "Repository layer for server-side reads",
      "Database status page",
      "Staff directory",
      "Organization data classification",
      "Demo / Sandbox / Production modes",
      "Customer read operations",
      "Customer list backed by Neon",
      "Household persistence",
      "Household reads"
    ],
    improved: [
      "Release Notes use shipped-version metadata",
      "Roadmap is organized around future milestones",
      "Demo data visibility in staff and platform admin views"
    ],
    fixed: [],
    changed: [
      "Versioning now follows CI/CD Semantic Versioning metadata",
      "localStorage is documented as non-authoritative for production data"
    ],
    knownIssues: [
      "Customer create, edit, and delete workflows still use demo persistence",
      "Memberships, check-ins, programs, registrations, POS, and authentication are not migrated yet"
    ]
  }
};

const platformDashboardReleaseNotesPolishRelease: ReleaseNote = {
  version: version.currentVersion,
  releaseName: version.releaseName,
  releaseDate: version.releaseDate,
  releaseType: version.releaseType,
  summary: version.summary,
  sections: {
    added: [],
    improved: [
      "Platform dashboard metrics",
      "KPI clarity",
      "Release Note badge consistency",
      "CI/CD release presentation"
    ],
    fixed: [],
    changed: [
      "Locations renamed to Facilities",
      "Staff Directory renamed to Staff Accounts",
      "Active renamed to Active Organizations",
      "Database Status renamed to Database Health"
    ],
    knownIssues: []
  }
};

function parseVersion(value: string) {
  return value
    .replace(/^v/i, "")
    .split(".")
    .map((part) => {
      const parsed = Number.parseInt(part, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    });
}

export function compareReleaseNotesNewestFirst(a: ReleaseNote, b: ReleaseNote) {
  const aParts = parseVersion(a.version);
  const bParts = parseVersion(b.version);
  const length = Math.max(aParts.length, bParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (bParts[index] ?? 0) - (aParts[index] ?? 0);
    if (difference !== 0) return difference;
  }

  const dateComparison = b.releaseDate.localeCompare(a.releaseDate);
  if (dateComparison !== 0) return dateComparison;

  return b.version.localeCompare(a.version);
}

const releaseNoteEntries: ReleaseNote[] = [
  platformDashboardReleaseNotesPolishRelease,
  realDataFoundationRelease,
  {
    version: "0.1.0",
    releaseDate: "2026-06-22",
    releaseName: "Pilot Readiness Release",
    releaseType: "minor",
    summary: "Initial external testing release for facility pilots.",
    sections: {
      added: [
        "Stone Cairn branding",
        "Pricing and support model",
        "Feedback and support entry points",
        "Documentation improvements",
        "Social sharing metadata and icons",
        "Versioning and release process foundations"
      ],
      improved: [
        "Navigation organization",
        "Sidebar scrolling",
        "Notification experience",
        "Demo environment readiness",
        "Visual consistency",
        "Staff login experience"
      ],
      fixed: [
        "Facility-specific staff login behavior",
        "Hydration mismatch issues",
        "Marketing page favicon issues",
        "Navigation highlighting issues",
        "Sidebar overflow",
        "Notification ordering issues"
      ],
      changed: [],
      knownIssues: [
        "Customer import tools not yet available",
        "Apple Wallet integration planned",
        "Demo data may feel artificial",
        "Payment processing not connected",
        "Some workflows may continue to evolve during pilot testing"
      ]
    }
  }
];

export const releaseNotes = [...releaseNoteEntries].sort(compareReleaseNotesNewestFirst);

export const latestRelease = releaseNotes[0];

export function getReleaseAnchor(value: string) {
  return `release-${value.replace(/^v/, "").replaceAll(".", "-")}`;
}

export function getReleaseNotesHref(value: string) {
  return `/release-notes#${getReleaseAnchor(value)}`;
}
