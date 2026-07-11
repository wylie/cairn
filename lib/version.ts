export type ReleaseType = "patch" | "minor" | "major";

export const version = {
  currentVersion: "0.4.1",
  releaseName: "Membership & Check-In Stabilization",
  releaseDate: "2026-07-11",
  releaseType: "patch" as ReleaseType,
  summary: "Membership and check-in workflows now provide clearer access decisions, safer duplicate prevention, and better persistence feedback."
} as const;

export function formatReleaseType(type: ReleaseType) {
  return type.replace(/\b\w/g, (char) => char.toUpperCase());
}

export const cairnVersion = {
  version: version.currentVersion,
  releaseName: version.releaseName,
  releaseDate: version.releaseDate,
  releaseType: version.releaseType,
  summary: version.summary
} as const;

export const CAIRN_VERSION = version.currentVersion;
export const CAIRN_RELEASE_DATE = version.releaseDate;
export const CAIRN_RELEASE_TYPE = formatReleaseType(version.releaseType);
