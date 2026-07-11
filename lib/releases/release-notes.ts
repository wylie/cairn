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
  version: "0.2.4",
  releaseName: "Release Notes Commit Links",
  releaseDate: "2026-06-21",
  releaseType: "patch",
  summary: "Release Notes are simpler to scan and can link to GitHub commits when metadata is available.",
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

const customerPersistenceRelease: ReleaseNote = {
  version: "0.3.0",
  releaseName: "Customer Persistence",
  releaseDate: "2026-07-11",
  releaseType: "minor",
  summary: "Customer CRUD now uses a Neon-backed repository and server persistence.",
  sections: {
    added: [
      "Customer CRUD",
      "Customer repository",
      "Neon persistence"
    ],
    improved: [
      "Validation",
      "Repository architecture"
    ],
    fixed: [],
    changed: [
      "Customer data no longer stored in localStorage"
    ],
    knownIssues: [
      "Memberships, check-ins, waivers, programs, POS, and authentication still use demo persistence"
    ]
  }
};

const householdPersistenceRelease: ReleaseNote = {
  version: "0.3.1",
  releaseName: "Household Persistence",
  releaseDate: "2026-07-11",
  releaseType: "patch",
  summary: "Household CRUD and customer-household relationships now persist through Neon.",
  sections: {
    added: [
      "Neon-backed household CRUD",
      "Persisted customer-household relationships",
      "Primary-contact management"
    ],
    improved: [
      "Household validation",
      "Household diagnostics",
      "Customer profile household data"
    ],
    fixed: [],
    changed: [
      "Household data no longer relies on localStorage"
    ],
    knownIssues: [
      "Memberships, check-ins, waivers, programs, POS, and authentication still use demo persistence"
    ]
  }
};

const customerExperienceImprovementsRelease: ReleaseNote = {
  version: "0.3.2",
  releaseName: "Customer Experience Improvements",
  releaseDate: "2026-07-11",
  releaseType: "patch",
  summary: "Customer search, validation, duplicate warnings, and profile clarity are improved for Neon-backed records.",
  sections: {
    added: [
      "Neon-backed customer search",
      "Duplicate-customer warnings",
      "Improved validation states"
    ],
    improved: [
      "Customer profile clarity",
      "Empty and loading states",
      "Error handling",
      "Customer and household data integrity"
    ],
    fixed: [
      "Persisted customer profiles no longer display mock access, waiver, check-in, POS, registration, document, communication, or alert records as persisted data",
      "Customer and household pages no longer fall back to mock records when Neon context is unavailable in the app"
    ],
    changed: [],
    knownIssues: [
      "Memberships, check-ins, waivers, programs, POS, documents, communications, and authentication still use demo persistence until their migration releases"
    ]
  }
};

const customerAdministrationDataQualityRelease: ReleaseNote = {
  version: "0.3.3",
  releaseName: "Customer Administration & Data Quality",
  releaseDate: "2026-07-11",
  releaseType: "patch",
  summary: "Customer and household administration, data-source visibility, repository boundaries, and workflow coverage are finalized for v0.3.x.",
  sections: {
    added: [],
    improved: [
      "Customer and household admin diagnostics",
      "Repository consistency",
      "Data-source visibility",
      "Customer operations documentation",
      "Automated coverage for customer workflows"
    ],
    fixed: [
      "Stale localStorage references in completed customer and household workflow documentation",
      "Unscoped customer and household repository helper exports",
      "Inaccurate customer and household admin metric coverage"
    ],
    changed: [],
    knownIssues: [
      "Memberships, check-ins, waivers, programs, POS, documents, communications, imports, merge workflows, and authentication remain deferred to later releases"
    ]
  }
};

const customerOperationsStabilizationRelease: ReleaseNote = {
  version: "0.3.4",
  releaseName: "Customer Operations Stabilization",
  releaseDate: "2026-07-11",
  releaseType: "patch",
  summary: "Customer and household workflows are stabilized with transactional writes, deterministic repository reads, and focused validation coverage.",
  sections: {
    added: [],
    improved: [
      "Customer and household workflow reliability",
      "Neon persistence verification",
      "Search performance and consistency",
      "Loading, error, and success states",
      "Tenant and data-mode safeguards"
    ],
    fixed: [
      "Customer delete and household mutation steps now run transactionally so related customer-household links cannot be partially updated",
      "Household repository mutations now reject invalid primary contacts before writing household records",
      "Customer and household repository reads now use deterministic ID tie-breakers after user-facing sort fields",
      "Customer and household server actions now return friendly database migration or availability errors instead of surfacing raw write failures"
    ],
    changed: [],
    knownIssues: [
      "Memberships, check-ins, waivers, programs, POS, documents, communications, imports, merge workflows, and authentication remain deferred to later releases"
    ]
  }
};

const sitemapRobotsConfigurationRelease: ReleaseNote = {
  version: "0.3.5",
  releaseName: "Sitemap & Robots Configuration",
  releaseDate: "2026-07-11",
  releaseType: "patch",
  summary: "Public sitemap, crawler rules, and production canonical URLs now separate indexable Cairn pages from private application routes.",
  sections: {
    added: [
      "Public XML sitemap",
      "Search-engine crawler rules"
    ],
    improved: [
      "Canonical metadata for public Cairn pages",
      "Separation of public and private routes for indexing"
    ],
    fixed: [],
    changed: [],
    knownIssues: [
      "Private, authenticated, administrative, and operational app routes remain excluded from indexing"
    ]
  }
};

const membershipsCheckInPersistenceRelease: ReleaseNote = {
  version: "0.4.0",
  releaseName: "Memberships & Check-In Persistence",
  releaseDate: "2026-07-11",
  releaseType: "minor",
  summary: "Membership management and front-desk check-ins now persist through Neon with centralized access-rule evaluation.",
  sections: {
    added: [
      "Neon-backed membership management",
      "Persistent customer check-ins and check-outs",
      "Centralized access-rule evaluation",
      "Membership and attendance diagnostics"
    ],
    improved: [
      "Customer profile membership visibility",
      "Currently-in and attendance workflows",
      "Tenant and facility isolation"
    ],
    fixed: [
      "Persisted customer profiles now show Neon-backed membership and check-in history instead of deferred membership placeholders"
    ],
    changed: [
      "Memberships and check-ins no longer rely on localStorage or mock persistence"
    ],
    knownIssues: [
      "Programs, registrations, POS, rentals, waivers, payment processing, imports, merge workflows, platform provisioning, and production authentication remain deferred"
    ]
  }
};

const membershipCheckInStabilizationRelease: ReleaseNote = {
  version: version.currentVersion,
  releaseName: version.releaseName,
  releaseDate: version.releaseDate,
  releaseType: version.releaseType,
  summary: version.summary,
  sections: {
    added: [],
    improved: [
      "Membership workflow reliability",
      "Check-in and check-out clarity",
      "Access-decision messaging",
      "Loading, success, and error states",
      "Database query performance"
    ],
    fixed: [
      "Duplicate overlapping active memberships are now rejected for the same owner, plan, and facility scope",
      "Expired, suspended, cancelled, future, and wrong-facility memberships now show specific check-in denial messages",
      "Membership create, edit, extend, status, check-in, and check-out actions now surface friendly success and error messages instead of failing silently",
      "Empty check-in search no longer loads the full customer list"
    ],
    changed: [],
    knownIssues: [
      "Programs, registrations, POS, rentals, waivers, payment processing, imports, merge workflows, platform provisioning, and production authentication remain deferred"
    ]
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
  membershipCheckInStabilizationRelease,
  membershipsCheckInPersistenceRelease,
  sitemapRobotsConfigurationRelease,
  customerOperationsStabilizationRelease,
  customerAdministrationDataQualityRelease,
  customerExperienceImprovementsRelease,
  householdPersistenceRelease,
  customerPersistenceRelease,
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
