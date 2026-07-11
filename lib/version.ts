export type ReleaseType = "patch" | "minor" | "major";

export const version = {
  currentVersion: "0.4.0",
  releaseName: "Memberships & Check-In Persistence",
  releaseDate: "2026-07-11",
  releaseType: "minor" as ReleaseType,
  summary: "Membership management and front-desk check-ins now persist through Neon with centralized access-rule evaluation."
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
