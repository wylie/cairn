export type ReleaseType = "patch" | "minor" | "major";

export const version = {
  currentVersion: "0.2.2",
  releaseName: "Release Badge Color Standardization",
  releaseDate: "2026-06-21",
  releaseType: "patch" as ReleaseType,
  summary: "Release badge colors now separate version labels, SemVer release types, and change categories."
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
