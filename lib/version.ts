export type VersionReleaseStatus = "in_progress" | "released" | "planned";

export const cairnVersion = {
  currentVersion: "0.2.0",
  currentReleaseName: "Real Data Foundation",
  currentReleaseStatus: "in_progress" as VersionReleaseStatus,
  latestReleasedVersion: "0.1.0",
  latestReleasedName: "Pilot Readiness Release",
  latestReleasedDate: "2026-06-22",
  nextReleaseTargetDate: "June 29, 2026",
  nextReleaseTargetDateIso: "2026-06-29"
} as const;

export function formatVersionStatus(status: VersionReleaseStatus) {
  if (status === "in_progress") return "In Progress";
  return status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export const CAIRN_VERSION = cairnVersion.currentVersion;
export const CAIRN_RELEASE_DATE = cairnVersion.nextReleaseTargetDateIso;
export const CAIRN_RELEASE_STATUS = formatVersionStatus(cairnVersion.currentReleaseStatus);

export const CAIRN_CURRENT_RELEASED_VERSION = cairnVersion.latestReleasedVersion;
export const CAIRN_CURRENT_RELEASED_DATE = cairnVersion.latestReleasedDate;
