import { version } from "@/lib/version";

export type ReleaseNoteSection = "added" | "improved" | "fixed" | "changed" | "knownIssues";

export const GITHUB_COMMIT_BASE_URL = "https://github.com/wylie/cairn/commit/";

export type ReleaseNote = {
  version: string;
  releaseName: string;
  releaseDate: string;
  releaseType: "patch" | "minor" | "major";
  summary: string;
  commitHash?: string;
  commitUrl?: string;
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

const releaseNotesCommitLinksRelease: ReleaseNote = {
  version: version.currentVersion,
  releaseName: version.releaseName,
  releaseDate: version.releaseDate,
  releaseType: version.releaseType,
  summary: version.summary,
  sections: {
    added: [],
    improved: [
      "Release Notes now link to GitHub commits when commit metadata is available",
      "Release Notes page is easier to scan"
    ],
    fixed: [],
    changed: [
      "Removed duplicated release summary card"
    ],
    knownIssues: []
  }
};

const neonReadinessAuditRelease: ReleaseNote = {
  version: "0.2.3",
  releaseName: "Neon Readiness Audit",
  releaseDate: "2026-06-21",
  releaseType: "patch",
  summary: "Data source inventory and database readiness visibility now clarify what is Neon-backed versus demo-backed.",
  commitHash: "e772dd0",
  sections: {
    added: [
      "Data source inventory",
      "Admin data source visibility",
      "Database health reporting"
    ],
    improved: [
      "Tenant isolation validation",
      "Real-data migration planning"
    ],
    fixed: [],
    changed: [],
    knownIssues: []
  }
};

const releaseBadgeColorStandardizationRelease: ReleaseNote = {
  version: "0.2.2",
  releaseName: "Release Badge Color Standardization",
  releaseDate: "2026-06-21",
  releaseType: "patch",
  summary: "Release badge colors now separate version labels, SemVer release types, and change categories.",
  commitHash: "24a3bba",
  sections: {
    added: [],
    improved: [
      "Release badge color consistency",
      "Version badge visual hierarchy",
      "SemVer type distinction"
    ],
    fixed: [
      "Inconsistent version badge styling across releases",
      "Patch badge visual treatment"
    ],
    changed: [
      "Version badges now use neutral styling",
      "Major, Minor, and Patch badges now use distinct colors"
    ],
    knownIssues: []
  }
};

const platformDashboardReleaseNotesPolishRelease: ReleaseNote = {
  version: "0.2.1",
  releaseName: "Platform Dashboard & Release Notes Polish",
  releaseDate: "2026-06-21",
  releaseType: "patch",
  summary: "Platform dashboard metrics, KPI labels, release badges, and CI/CD release presentation are clearer.",
  commitHash: "0d9cdce",
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
  releaseNotesCommitLinksRelease,
  neonReadinessAuditRelease,
  releaseBadgeColorStandardizationRelease,
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

export function getReleaseCommitUrl(release: Pick<ReleaseNote, "commitHash" | "commitUrl">) {
  if (release.commitUrl) return release.commitUrl;
  if (!release.commitHash) return null;
  return `${GITHUB_COMMIT_BASE_URL}${release.commitHash}`;
}

export function getShortCommitHash(commitHash: string) {
  return commitHash.slice(0, 7);
}
