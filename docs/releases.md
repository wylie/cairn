# Releases

Cairn uses lightweight semantic-style versioning during pilot testing.

## Versioning

Versions are stored in `lib/version.ts`.

- `v0.x.x` means pilot or pre-production.
- `v1.0.0` means the first stable customer-ready release.
- Patch releases, such as `v0.1.1`, are small fixes.
- Minor releases, such as `v0.2.0`, add meaningful product capability.

All application version displays should read from `CAIRN_VERSION` and `CAIRN_RELEASE_DATE`.

## Release Cadence

Planned release window: Sunday evening.

Cairn uses weekly planned releases. Release notes are updated before every planned release, and testers or facilities should expect visible product changes after the Sunday evening release window. Urgent fixes may ship outside the normal release window when needed.

## Build and Deployment Discipline

Development work can continue during the week, but normal weekday work should be committed locally or merged to a non-production branch instead of being pushed or deployed to production immediately.

Production deploys should be reserved for the Sunday evening release window unless the change is an urgent fix. Release notes should be updated before any production deployment so facilities can see what changed.

This is intentionally lightweight for pilot testing. Cairn does not need complex release automation yet.

## Release Note Workflow

Release notes are file-based in `lib/releases/release-notes.ts`.

To add a release:

1. Update `CAIRN_VERSION` and `CAIRN_RELEASE_DATE` in `lib/version.ts`.
2. Add a new release entry to `releaseNotes`.
3. Include sections for `new`, `improved`, `fixed`, and `knownIssues`.
4. Keep facility-facing notes clear and avoid platform-only implementation details.
5. Run the build before committing.

The newest release appears first on the staff Release Notes page.

## Notification Workflow

Update notifications are generated from release note data by `lib/releases/notifications.ts`.

When a release entry becomes the latest release, Cairn can generate a system notification such as:

`Cairn has been updated to v0.2.0. View what's new.`

The notification uses the existing communications notification center, counts toward unread totals, can be marked read, and links directly to the matching release note anchor.

## Current Release

Current version: `v0.1.0`

Release date: `2026-06-17`

Title: Pilot Readiness Release
