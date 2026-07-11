# Technical Debt

This log captures deferred work discovered during v0.2.0 release readiness. These items are intentionally out of scope for the Real Data Foundation release.

## v0.3.0 - Customer Persistence

- Move customer merge operations behind server actions or route handlers.
- Move household management writes behind the server layer.
- Define customer and household permission checks before enabling production writes.
- Add tests for customer search, tenant isolation, and customer empty states.
- Decide how demo customer records should differ from sandbox and production customer records.

## v0.4.0 - Memberships & Check-In

- Create membership, pass, waiver-readiness, and check-in schemas.
- Move membership and check-in writes out of localStorage.
- Define server-side access evaluation so check-in decisions are authoritative.
- Preserve fast front-desk workflows while moving validations to the server.
- Add rollback and audit behavior for check-ins, check-outs, and membership state changes.
- Decide how imported memberships attach to customers and households.

## v0.5.0 - Programs & Registrations

- Replace remaining public program catalog helper reads with Neon-backed public catalog queries.
- Move calendar/session state from mock state to the new server repository where practical.
- Define richer registration eligibility checks on the server after waivers and public checkout are migrated.
- Model transfers, cancellation audit history, and richer attendance updates.
- Add operational reporting hooks for program participation.
- Decide how program data imports should validate organization and facility ownership.

## Cross-Release Debt

- Replace mock authentication with production staff identity and session management.
- Replace platform-admin localStorage organization registry with server-backed platform data.
- Establish audit logs for support access and operational mutations.
- Add integration tests around tenant boundaries before enabling production writes.
- Keep localStorage limited to harmless UI preferences and short-lived drafts.
