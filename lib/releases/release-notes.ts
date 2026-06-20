import { cairnVersion, formatVersionStatus } from "@/lib/version";

export type ReleaseNoteSection = "new" | "improved" | "fixed" | "knownIssues";

export type ReleaseNote = {
  version: string;
  date: string;
  title: string;
  summary: string;
  status: "Released";
  sections: Record<ReleaseNoteSection, string[]>;
};

export type ActiveRelease = {
  version: string;
  title: string;
  targetDate: string;
  status: "In Progress";
  focus: string[];
  sections: {
    added: string[];
  };
};

export const activeRelease: ActiveRelease = {
  version: cairnVersion.version,
  title: cairnVersion.releaseName,
  targetDate: cairnVersion.targetDateIso,
  status: formatVersionStatus(cairnVersion.status) as ActiveRelease["status"],
  focus: [
    "Neon database foundation",
    "Drizzle ORM",
    "Organization persistence",
    "Facility persistence",
    "Staff accounts",
    "Multi-tenant architecture",
    "localStorage migration planning"
  ],
  sections: {
    added: [
      "Neon database integration",
      "Drizzle ORM foundation",
      "Initial database schema",
      "Migration infrastructure",
      "Database health monitoring",
      "Organization schema",
      "Facility schema",
      "Seed data",
      "Repository layer",
      "Database status page",
      "Staff database model",
      "Staff seed data",
      "Staff repositories",
      "Staff directory",
      "Organization boundary validation",
      "Organization data classification",
      "Demo / Sandbox / Production modes",
      "Tenant data boundary rules",
      "Data ownership documentation",
      "Customer schema",
      "Household schema",
      "Customer repository layer",
      "Household repository layer",
      "Customer migration planning",
      "Household migration planning",
      "Customer seed data",
      "Customer repository expansion",
      "Customer list backed by Neon",
      "Customer counts"
    ]
  }
};

function parseVersion(version: string) {
  return version
    .replace(/^v/i, "")
    .split(".")
    .map((part) => {
      const value = Number.parseInt(part, 10);
      return Number.isFinite(value) ? value : 0;
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

  const dateComparison = b.date.localeCompare(a.date);
  if (dateComparison !== 0) return dateComparison;

  return b.version.localeCompare(a.version);
}

const releaseNoteEntries: ReleaseNote[] = [
  {
    version: "0.1.0",
    date: "2026-06-22",
    title: "Pilot Readiness Release",
    summary: "Initial external testing release for facility pilots.",
    status: "Released",
    sections: {
      new: [
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

export function getReleaseAnchor(version: string) {
  return `release-${version.replace(/^v/, "").replaceAll(".", "-")}`;
}

export function getReleaseNotesHref(version: string) {
  return `/release-notes#${getReleaseAnchor(version)}`;
}
