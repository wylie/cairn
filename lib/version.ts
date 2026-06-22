export type ReleaseType = "patch" | "minor" | "major";

export const version = {
  currentVersion: "0.3.0",
  releaseName: "Customer & Household Persistence",
  releaseDate: "2026-06-21",
  releaseType: "minor" as ReleaseType,
  summary: "Customers and households are now editable Neon-backed business workflows."
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
