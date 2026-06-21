# Releases

Cairn uses CI/CD release discipline with Semantic Versioning 2.0.0.

## Versioning & Release Process

`main` is always expected to be deployable. Releases happen continuously as changes are merged, verified, and deployed. Version numbers track shipped software, not branches.

Version metadata is centralized in `lib/version.ts`.

Current shipped version metadata:

- `currentVersion`: `0.2.3`
- `releaseName`: `Neon Readiness Audit`
- `releaseDate`: `2026-06-21`
- `releaseType`: `patch`
- `summary`: `Data source inventory and database readiness visibility now clarify what is Neon-backed versus demo-backed.`

All active application version displays should read from the `version` object in `lib/version.ts`. Compatibility exports may exist for older components, but they must derive from `version`.

## Semantic Versioning

Cairn follows SemVer-style increments during pilot and production work.

### PATCH

Use PATCH versions for bug fixes, UI polish, accessibility improvements, documentation, refactors, cleanup, and internal improvements. Patch releases are expected and normal during continuous deployment.

Examples:

- `0.2.1`
- `0.2.2`
- `0.2.3`

### MINOR

Use MINOR versions for new user-visible capability such as customer workflows, memberships, check-in persistence, reporting features, or operational modules.

Examples:

- `0.3.0`
- `0.4.0`
- `0.5.0`

### MAJOR

Use MAJOR versions for breaking schema changes, API breaking changes, or major architectural shifts.

Examples:

- `1.0.0`
- `2.0.0`

Every releasable commit should increment the product version before deployment. For now:

- Feature commits increment MINOR when user-visible.
- Fixes, refactors, documentation, and internal improvements increment PATCH.

## Release Note Workflow

Release notes are file-based in `lib/releases/release-notes.ts`.

Release Notes are Cairn's authoritative product history. Every version bump receives a Release Notes entry, including patch versions such as `0.2.1`, `0.2.2`, and `0.2.3`.

To ship a version:

1. Update `version` in `lib/version.ts`.
2. Add or update the shipped release entry in `releaseNotes`.
3. Include `version`, `releaseType`, `releaseDate`, `releaseName`, `summary`, `added`, `improved`, `fixed`, `changed`, and `knownIssues`.
4. Keep facility-facing notes clear and avoid platform-only implementation details when possible.
5. Run the build before committing.

The newest release appears first on the staff Release Notes page. Release Notes document shipped versions only.

## Release Badge System

Release version badges use one neutral style:

- Version chips: gray / slate

Release type badges use SemVer release-type colors:

- Major: red / rose
- Minor: purple / indigo
- Patch: blue / cyan

Release section badges use separate semantic colors:

- Added: green
- Improved: blue
- Changed: yellow
- Fixed: slate / blue-gray
- Known Issues: amber

Do not use green for version or release type badges. Shared release badge components live in `components/releases/release-badges.tsx`.

## Build and Deployment Discipline

Development work should keep `main` deployable. A change is ready to merge when it is scoped, reviewed, documented when needed, and verified with the relevant build or tests.

Production deploys may happen continuously after verification. Release notes should be updated with the same change when a shipped version changes user-visible behavior or operational expectations.

## Demo Data Visibility

Organizations carry a `dataMode` of `demo`, `sandbox`, or `production`.

- Demo organizations show a `Demo` badge and a subtle staff-workflow banner: "This organization contains demonstration data for evaluation purposes."
- Sandbox organizations show a `Sandbox` badge in normal facility workflows.
- Production organizations are not prominently labeled in normal facility workflows.
- Platform Admin may show all modes, including `Production`, for operational clarity.

## Roadmap Workflow

The roadmap is milestone-based and maintained in `lib/releases/roadmap.ts` for the in-app staff view and `docs/roadmap.md` for documentation.

To update the roadmap:

1. Review future milestones after shipped releases change product direction.
2. Update version ranges, focus areas, status, or production-readiness criteria.
3. Keep roadmap language directional.
4. Keep the in-app roadmap and documentation roadmap aligned.

## Notification Workflow

Update notifications are generated from release note data by `lib/releases/notifications.ts`.

When a release entry becomes the latest release, Cairn can generate a system notification such as:

`Cairn has been updated to v0.2.3. View what's new.`

The notification uses the existing communications notification center, counts toward unread totals, can be marked read, and links directly to the matching release note anchor.

## Current Shipped Version

Version: `v0.2.3`

Released: `2026-06-21`

Title: Neon Readiness Audit

Release type: Patch

Summary: Data source inventory and database readiness visibility now clarify what is Neon-backed versus demo-backed.

### v0.2.3 Notes

#### Added

- Data source inventory
- Admin data source visibility
- Database health reporting

#### Improved

- Tenant isolation validation
- Real-data migration planning

### v0.2.2 Notes

#### Improved

- Release badge color consistency
- Version badge visual hierarchy
- SemVer type distinction

#### Changed

- Version badges now use neutral styling
- Major, Minor, and Patch badges now use distinct colors

#### Fixed

- Inconsistent version badge styling across releases
- Patch badge visual treatment

### v0.2.1 Notes

#### Improved

- Platform dashboard metrics
- KPI clarity
- Release Note badge consistency
- CI/CD release presentation

#### Changed

- Locations renamed to Facilities
- Staff Directory renamed to Staff Accounts
- Active renamed to Active Organizations
- Database Status renamed to Database Health

### v0.2.0 Notes

#### Added

- Neon database integration
- Drizzle ORM foundation
- Initial database schema
- Migration infrastructure
- Database health monitoring
- Organization schema
- Facility schema
- Staff database model
- Customer schema
- Household schema
- Seed data for organizations, facilities, staff, customers, and households
- Repository layer for server-side reads
- Database status page
- Staff directory
- Organization data classification
- Demo / Sandbox / Production modes
- Customer read operations
- Customer list backed by Neon
- Household persistence
- Household reads

#### Improved

- Release Notes use shipped-version metadata.
- Roadmap is organized around future milestones.
- Demo data visibility appears in staff and platform admin views.

#### Changed

- Versioning now follows CI/CD Semantic Versioning instead of branch metadata.
- localStorage is documented as non-authoritative for production data.

Release readiness references:

- [v0.2.0 Release Checklist](./releases/v0.2.0-release-checklist.md)
- [Technical Debt Log](./technical-debt.md)
