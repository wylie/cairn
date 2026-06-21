export type ReleaseType = "patch" | "minor" | "major";

export const version = {
  currentVersion: "0.2.1",
  releaseName: "Platform Dashboard & Release Notes Polish",
  releaseDate: "2026-06-21",
  releaseType: "patch" as ReleaseType,
  summary: "Platform dashboard metrics, KPI labels, release badges, and CI/CD release presentation are clearer."
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
