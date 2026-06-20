export type VersionReleaseStatus = "in_progress" | "released" | "planned";

export const cairnVersion = {
  version: "0.2.0",
  releaseName: "Real Data Foundation",
  status: "in_progress" as VersionReleaseStatus,
  targetDate: "June 29, 2026",
  targetDateIso: "2026-06-29"
} as const;

export function formatVersionStatus(status: VersionReleaseStatus) {
  if (status === "in_progress") return "In Progress";
  return status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export const CAIRN_VERSION = cairnVersion.version;
export const CAIRN_RELEASE_DATE = cairnVersion.targetDateIso;
export const CAIRN_RELEASE_STATUS = formatVersionStatus(cairnVersion.status);
