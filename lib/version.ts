export type ReleaseType = "patch" | "minor" | "major";

export const version = {
  currentVersion: "0.2.3",
  releaseName: "Neon Readiness Audit",
  releaseDate: "2026-06-21",
  releaseType: "patch" as ReleaseType,
  summary: "Data source inventory and database readiness visibility now clarify what is Neon-backed versus demo-backed."
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
