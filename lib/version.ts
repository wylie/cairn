export type ReleaseType = "patch" | "minor" | "major";

export const version = {
  currentVersion: "0.3.4",
  releaseName: "Customer Operations Stabilization",
  releaseDate: "2026-07-11",
  releaseType: "patch" as ReleaseType,
  summary: "Customer and household workflows are stabilized with transactional writes, deterministic repository reads, and focused validation coverage."
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
