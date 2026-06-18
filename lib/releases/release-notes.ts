import { CAIRN_RELEASE_DATE, CAIRN_VERSION } from "@/lib/version";

export type ReleaseNoteSection = "new" | "improved" | "fixed" | "knownIssues";

export type ReleaseNote = {
  version: string;
  date: string;
  title: string;
  summary: string;
  sections: Record<ReleaseNoteSection, string[]>;
};

export const releaseNotes: ReleaseNote[] = [
  {
    version: CAIRN_VERSION,
    date: CAIRN_RELEASE_DATE,
    title: "Pilot Readiness Release",
    summary: "Initial external testing release for facility pilots.",
    sections: {
      new: [
        "Stone Cairn branding",
        "Pricing and support model",
        "Feedback and support entry points",
        "Documentation improvements",
        "Social sharing metadata and icons"
      ],
      improved: [
        "Navigation organization",
        "Sidebar scrolling",
        "Notification experience",
        "Demo environment readiness",
        "Visual consistency"
      ],
      fixed: [
        "Facility-specific staff login behavior",
        "Hydration mismatch issues",
        "Marketing page favicon issues",
        "Navigation highlighting issues",
        "Sidebar overflow"
      ],
      knownIssues: [
        "Customer import tools not yet available",
        "Apple Wallet integration planned",
        "Demo data may feel artificial",
        "Payment processing not connected"
      ]
    }
  }
].sort((a, b) => b.date.localeCompare(a.date) || b.version.localeCompare(a.version));

export const latestRelease = releaseNotes[0];

export function getReleaseAnchor(version: string) {
  return `release-${version.replace(/^v/, "").replaceAll(".", "-")}`;
}

export function getReleaseNotesHref(version: string) {
  return `/release-notes#${getReleaseAnchor(version)}`;
}
