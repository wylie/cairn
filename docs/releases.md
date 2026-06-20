# Releases

Cairn uses lightweight semantic-style versioning during pilot testing.

## Versioning

Version metadata is centralized in `lib/version.ts`.

- `v0.x.x` means pilot or pre-production.
- `v1.0.0` means the first stable customer-ready release.
- Patch releases, such as `v0.1.1`, are small fixes.
- Minor releases, such as `v0.2.0`, add meaningful product capability.

Active development version displays should read from the `cairnVersion` object in `lib/version.ts`. Compatibility exports may exist for older components, but they must derive from `cairnVersion`.

Current branch metadata:

- `currentVersion`: `0.2.0`
- `currentReleaseName`: `Real Data Foundation`
- `currentReleaseStatus`: `in_progress`
- `latestReleasedVersion`: `0.1.0`
- `latestReleasedName`: `Pilot Readiness Release`
- `nextReleaseTargetDate`: `June 29, 2026`

Historical release entries should use the historical fields from `cairnVersion` so past release notes do not change when the active branch version advances.

## Release Cadence

Planned release window: Sunday evening.

Cairn uses weekly planned releases. Release notes are updated before every planned release, and testers or facilities should expect visible product changes after the Sunday evening release window. The roadmap is reviewed weekly before release. Urgent fixes may ship outside the normal release window when needed.

## Build and Deployment Discipline

Development work can continue during the week, but normal weekday work should remain on the release branch until release day or be merged to a non-production branch instead of being pushed or deployed to production immediately.

Production deploys should be reserved for the Sunday evening release window unless the change is an urgent fix. Release notes should be updated before any production deployment so facilities can see what changed.

This is intentionally lightweight for pilot testing. Cairn does not need complex release automation yet.

## Release Note Workflow

Release notes are file-based in `lib/releases/release-notes.ts`.

To add a release:

1. Update `cairnVersion` in `lib/version.ts`.
2. Add a new release entry to `releaseNotes`.
3. Include sections for `new`, `improved`, `fixed`, and `knownIssues`.
4. Keep facility-facing notes clear and avoid platform-only implementation details.
5. Run the build before committing.

The newest release appears first on the staff Release Notes page.

Upcoming active releases may also be shown on the Release Notes page before they are released. These are planning/status sections, not completed release notes.

## Branch and Version Workflow

Release branches should identify themselves with `cairnVersion.currentVersion`. On the `june-28-2026` branch, app chrome and active-development pages show `v0.2.0`.

The Release Notes page must distinguish:

- current released version: `v0.1.0`
- active development version: `v0.2.0`

Do not rewrite historical release content when advancing the active development version.

## Demo Data Visibility

Organizations carry a `dataMode` of `demo`, `sandbox`, or `production`.

- Demo organizations show a `Demo` badge and a subtle staff-workflow banner: "This organization contains demonstration data for evaluation purposes."
- Sandbox organizations show a `Sandbox` badge in normal facility workflows.
- Production organizations are not prominently labeled in normal facility workflows.
- Platform Admin may show all modes, including `Production`, for operational clarity.

## Roadmap Workflow

The roadmap is version-based and maintained in `lib/releases/roadmap.ts` for the in-app staff view and `docs/roadmap.md` for documentation.

To update the roadmap:

1. Review roadmap status before the Sunday evening release window.
2. Update version targets, focus areas, status, or production-readiness criteria.
3. Keep roadmap language facility-facing and clear that dates are targets, not guarantees.
4. Keep the in-app roadmap and documentation roadmap aligned.

## Notification Workflow

Update notifications are generated from release note data by `lib/releases/notifications.ts`.

When a release entry becomes the latest release, Cairn can generate a system notification such as:

`Cairn has been updated to v0.2.0. View what's new.`

The notification uses the existing communications notification center, counts toward unread totals, can be marked read, and links directly to the matching release note anchor.

## Current Release

Current released version: `v0.1.0`

Release date: `2026-06-22`

Title: Pilot Readiness Release

Status: Released

## Active Development Release

Version: `v0.2.0`

Target date: `2026-06-29`

Title: Real Data Foundation

Status: In Progress

Focus:

- Neon database foundation
- Drizzle ORM
- Organization persistence
- Facility persistence
- Staff accounts
- Multi-tenant architecture
- localStorage migration planning

### Unreleased v0.2.0 Notes

#### Added

- Neon database integration
- Drizzle ORM foundation
- Initial database schema
- Migration infrastructure
- Database health monitoring
- Organization schema
- Facility schema
- Seed data
- Repository layer
- Database status page
- Staff database model
- Staff seed data
- Staff repositories
- Staff directory
- Organization boundary validation
- Organization data classification
- Demo / Sandbox / Production modes
- Tenant data boundary rules
- Data ownership documentation
- Customer schema
- Household schema
- Customer repository layer
- Household repository layer
- Customer migration planning
- Household migration planning

v0.2.0 starts the transition from demo/localStorage persistence toward real server-backed persistence. It is active development work and has not been released yet.
