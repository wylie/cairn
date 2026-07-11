# Real Data Implementation Plan

v0.2.x focuses on building Cairn's real data foundation. This document turns the architecture direction into an implementation sequence without introducing database code in this planning milestone.

## Current State

Cairn currently uses localStorage-backed mock persistence for demo workflows.

- Seeded records live in `lib/mocks/*`.
- Operational workflow state is held in React state providers under `lib/state/*`.
- `lib/mock-storage.ts` writes scoped mock data into `window.localStorage`.
- Mock authentication uses seeded accounts and encoded cookies.
- Support sessions, organization provisioning, settings, integrations, communications, and workflow records are still demo persistence, not production persistence.

This model is useful for pilot review because it keeps the app demoable without external services. It is not acceptable as the production source of truth.

## Production Direction

Target architecture:

```text
Browser
  |
Next.js server layer
  |
Route Handlers / Server Actions
  |
Drizzle ORM
  |
Neon PostgreSQL
```

Neon PostgreSQL should become the durable system of record for production data. Drizzle ORM is the preferred schema and query layer because it keeps database access typed and explicit while fitting the current TypeScript codebase.

The Next.js server layer should own all production reads and writes. Browser code should call server actions or route handlers instead of reading or writing authoritative records directly.

## Global Version Metadata

`lib/version.ts` owns shipped version metadata through the `version` object.

- Current version displays read `currentVersion`, `releaseName`, `releaseDate`, `releaseType`, and `summary`.
- Cairn identifies the shipped product through `version.currentVersion`.
- Historical release entries, such as `v0.1.0`, stay in Release Notes below the current shipped version.
- Release Notes and Roadmap should use `version` for current version display instead of hardcoded strings.
- Cairn uses CI/CD release discipline with Semantic Versioning.
- Release Notes show shipped versions only.

## New State: Database Foundation Established

v0.2.x now includes the first production data foundation pieces.

- Drizzle ORM, Drizzle Kit, and the `postgres` client are installed.
- `DATABASE_URL` is documented in `.env.example` for Neon PostgreSQL connections.
- `drizzle.config.ts` defines schema and migration paths.
- `db/schema` contains intentionally minimal tables for organizations, organization data classification, facilities, staff users, staff roles, staff role assignment, staff facility access, customers, and households.
- `db/migrations` contains the initial SQL migration generated from the schema.
- `db/index.ts` exposes the typed database client.
- `/api/internal/database-health` verifies whether the configured database connection is reachable without exposing credentials or connection details.
- `/admin/database` now shows connection state, known table count, record counts by table, the latest committed Drizzle migration, and seed data status.
- `/admin/data-sources` now exposes the v0.3.2 data-source inventory for platform administrators.
- `npm run db:generate`, `npm run db:migrate`, and `npm run db:studio` provide the migration and inspection workflow.
- Local tooling loads `DATABASE_URL` from `.env.local`.

This foundation does not change existing application behavior. Current workflows still use the mock/localStorage implementation until future migration work replaces each domain intentionally.

## Organization & Facility Persistence Started

Organizations and facilities are the first data area wired toward the production database.

- `npm run db:seed` seeds the initial tenant foundation into the configured database.
- Seeded organizations: Summit Rec Collective, Riverstone Nature Center, and Western Carolina YMCA Association.
- Seeded demo organizations are classified with `data_mode = demo`.
- Seeded facilities include each organization's initial facility records and slugs.
- `db/repositories` provides server-only repository functions for organization lookup, facility lookup, organization-scoped facility lists, and counts.
- `db/tenant.ts` provides fallback-aware active facility context on top of the repository layer.
- Facility lookup requires organization scope so facility slugs do not become global tenant bypasses.
- The public facility landing page can read organization and facility display data from the database when available.
- `/admin/database` shows connection status, table count, record counts, migration metadata, and seed data status for internal review.
- `/admin/data-sources` identifies each major module as Neon-backed, demo-backed, local-only, or not yet migrated.
- If `DATABASE_URL` is missing or the database query fails, the same helpers fall back to canonical demo seed data so local demo mode remains stable.

v0.3.x migrates customer CRUD, household CRUD, customer-household links, and profile search to Neon through the repository layer. Memberships, programs, registrations, POS, waivers, notifications, support requests, check-ins, and authentication still use the existing mock/localStorage implementation until their planned migration phases.

## Data Classification Layer

The organization record now owns a `data_mode` classification.

- `demo`: Cairn-owned sample data for demos, screenshots, testing, documentation, and sales presentations.
- `sandbox`: client-owned testing data for onboarding, training, and experimentation.
- `production`: real operational customer data for live facilities and reporting.

All records beneath an organization inherit that mode:

```text
Organization
  ├─ Facilities
  ├─ Staff
  ├─ Customers
  ├─ Households
  ├─ Memberships
  ├─ Programs
  ├─ Registrations
  └─ Reporting
```

Rules before customer migration:

- Demo organizations must only contain demo data.
- Sandbox organizations must only contain sandbox data.
- Production organizations must only contain production data.
- Never import or create production customers inside a demo organization.
- Future import tooling must choose or create the production organization before migrating customers, households, memberships, registrations, waivers, or transactions.

Visibility:

- Demo organizations show a `Demo` badge in staff/facility app chrome.
- Demo organizations show a subtle dismissible banner that says the organization contains demonstration data for evaluation purposes.
- Sandbox organizations show a `Sandbox` badge in staff/facility app chrome.
- Production organizations are not prominently labeled in normal facility workflows.
- Platform Admin views may show `Demo`, `Sandbox`, and `Production` badges for all organizations.

## Staff Accounts Foundation Started

Staff account records are now seeded into Neon for the first tenant foundation.

- Seeded staff users belong to one organization through `staff_users.organization_id`.
- Staff roles are organization-owned records and staff users can reference a role through `staff_users.role_id`.
- Facility access is modeled through `staff_facility_access`, keeping facility permissions separate from the staff identity record.
- `db/repositories/staff-repository.ts` exposes server-only staff reads for one staff user, all staff users, staff by organization, and staff by facility.
- `/admin/staff` provides a read-only internal staff directory backed by Neon.
- `/admin/database` includes staff user counts and a last-updated timestamp.

This is not production authentication. Existing login flows still use mock authentication. Future authentication should verify identity with a production auth provider, match the authenticated principal to a database staff user, and then enforce organization, role, permission, and facility boundaries on the server.

Organization boundary audit:

- Organizations are root tenants and own facilities, staff roles, and staff users.
- Organization `data_mode` is inherited by facilities, staff, future customers, households, memberships, programs, registrations, and reports.
- Facilities require `organization_id`, so future facility-scoped records can inherit organization scope from their facility.
- Staff users require `organization_id`, so staff records cannot float outside a tenant.
- Facility repository lookups require organization scope before matching slugs.
- Current customer and household list pages resolve active organization before querying Neon.
- Broad repository reads and counts are limited to platform-admin/database visibility surfaces.
- Future customer, household, membership, registration, POS, waiver, notification, and support records should include `organization_id`; facility-scoped records should also include `facility_id`.

## Customer Foundation Started

Customer and household database foundations now exist. Customer list/detail/create/edit/delete/search operations for modeled profile fields now use Neon through server actions and repository helpers. Household list/detail/create/edit/delete, member add/remove, and primary-contact operations also use Neon, while richer relationship roles remain future work.

- `customers` stores organization-owned customer profile fields: name, preferred name, pronouns, member ID, contact details, address, birth date, emergency contact, notes, profile photo URL, household link, active status, and timestamps.
- `households` stores organization-owned household records with an optional primary contact reference.
- `db/repositories/customer-repository.ts` exposes server-only reads, normalized organization-scoped customer search, counts, create, edit, delete, duplicate warnings, potential duplicate pair counts, and last-created reporting.
- `db/repositories/household-repository.ts` exposes server-only reads, counts, create, edit, delete, member reads, member add/remove, primary-contact updates, duplicate checks, and customer household-link clearing.
- `/admin/database` now reports customer count, searchable customer count, potential duplicate pairs, last customer created, customer seed count, household counts, customers assigned to households, and customers without households from Neon for internal validation, plus migration and seed-run availability metadata.
- `npm run db:seed` now seeds small fictional customer and household sets for Summit Rec Collective, Riverstone Nature Center, and Western Carolina YMCA Association.
- The staff customer list and detail pages read organization-scoped customers from Neon through the repository layer and map them into the existing customer UI.
- Customer search is Neon-backed and organization-scoped. It trims and normalizes input and supports partial matching on first name, last name, preferred name, email, and phone.
- The staff customer create/edit/delete flows call server actions that resolve the active organization before repository writes.
- Customer create/edit actions share validation for required fields, email format, normalized phone values, birth-date validity, and US state format.
- Duplicate-customer checks warn on exact email, exact normalized phone, or matching name plus birth date; staff can save anyway when the possible match is not the same person.
- Persisted customer profiles show persisted profile and household data only. Membership, access, check-in, waiver, POS, registration, document, communication, and alert areas are labelled as deferred instead of showing demo records.
- Customer records are no longer loaded from or saved to the customer localStorage mock key.
- The staff household list and detail pages read organization-scoped households from Neon through the repository layer and map them into the existing household workspace UI.
- The staff household create/edit/delete flows call server actions that resolve the active organization before repository writes.
- Household member add/remove and primary-contact changes call server actions that resolve the active organization before repository writes.
- Household records and relationship links are no longer loaded from or saved to household localStorage mock keys.

Memberships, check-ins, registrations, waivers, POS, documents, communications, customer merge, richer relationship roles, billing behavior, and authentication are not migrated yet. Those workflows continue to use localStorage-backed mock data until their models, import paths, and write semantics are finalized.

Seed strategy:

- Demo customers should stay intentionally small and fictional until household structure, membership ownership, and emergency-contact relationships are stable.
- Demo households should be small, realistic, and explicitly tied to demo organizations with `data_mode = demo`.
- Sandbox customer seeds should be generated only for client-owned training environments.
- Production customer data should enter through import/onboarding workflows, not through demo seed scripts.
- Future seed scripts must be idempotent and must never create production records inside demo organizations.

Customer And Household Migration Plan:

Current: customer and household records are Neon-backed for modeled CRUD, customer search, validation, duplicate warnings, and customer-household links. Remaining customer-adjacent workflows such as memberships, check-ins, registrations, waivers, POS, documents, communications, merge behavior, richer relationship roles, and billing still use localStorage-backed mock data until their models are migrated.

Future: Neon PostgreSQL becomes the durable source of truth through the Next.js server/data layer.

Phases:

1. Schema - create minimal organization-owned `customers` and `households` tables. Complete.
2. Repositories - add server-only customer and household read helpers. Complete.
3. Seed/demo data - design and add a limited demo seed set after relationships stabilize. Initial customer and household seeds are complete.
4. Read operations - move low-risk customer and household views to server-backed reads. Customer and household list/detail reads are complete for modeled fields and no longer fall back to mock records in app routes when Neon context is unavailable.
5. Write operations - move customer and household creates, updates, deletes, and household membership changes behind server actions or route handlers. Customer and household writes are complete for modeled fields; merge workflows, richer relationship roles, and audit trails remain future work.
6. Full migration - retire remaining localStorage customer-adjacent adjunct state after imports, permissions, tests, and rollback paths exist.

## localStorage Policy

Going forward, localStorage should only hold harmless local UI preferences and short-lived drafts.

Acceptable local examples:

- calendar view preference
- report filter session state
- dismissed announcement state
- sidebar or table display preferences
- pre-checkout cart drafts before a server-backed checkout is submitted

Not acceptable as local-only production data:

- organizations or facilities
- staff accounts, roles, permissions, or audit logs
- customers, households, memberships, registrations, waivers, or check-ins
- POS products, transactions, receipts, refunds, or inventory changes
- support requests, support sessions, notifications, or integration audit logs

## v0.2.x Implementation Sequence

### 1. Data Boundary Inventory

Goal: identify every place production data enters, changes, or leaves the app.

Deliverables:

- Map current `lib/state/*` providers to future server-backed domains. Complete in [Data Sources](./data-sources.md).
- Mark which localStorage keys can be retired, migrated, or kept as UI preferences. In progress through the v0.3.2 inventory.
- Confirm tenant scope for each domain: organization-level, facility-level, customer-level, or platform-level. Initial audit complete for current repositories.

### 2. Schema Foundation

Goal: define the first durable database model without changing workflows yet.

Deliverables:

- Add Neon PostgreSQL connection configuration through `DATABASE_URL`. Complete.
- Add Drizzle schema for organizations, facilities, staff users, staff roles, and staff facility access. Complete.
- Add Drizzle schema for customers and households. Complete.
- Define IDs, tenant keys, timestamps, and initial relational constraints. Complete.
- Define seed strategy for existing demo organizations in future work.

### 3. Server Access Layer

Goal: move authoritative reads and writes behind Next.js server boundaries.

Deliverables:

- Define route handler/server action patterns for scoped reads and mutations.
- Establish server-side tenant resolution.
- Establish server-side permission checks.
- Define error shapes that existing UI workflows can consume.

### 4. Identity & Organization Foundation

Goal: make organization and staff access durable before migrating operational records.

Deliverables:

- Persist organizations and facilities in the database. Initial organization and facility seed/read support is now in place.
- Persist staff users, roles, permissions, and facility assignments. Staff users, roles, and facility assignments are now seeded for the foundation; permissions remain future work.
- Persist customer and household foundations. Schema, repositories, demo seed data, list/detail reads, and modeled create/edit/delete workflows are now in place.
- Replace browser organization registry persistence with server-backed organization data.
- Preserve existing demo login and seeded workflows until the authentication foundation replaces them.

### 5. Migration Readiness

Goal: prepare later v0.3+ work to move customer and workflow data safely.

Deliverables:

- Decide how seeded demo data becomes database seed data.
- Define migration scripts for local demo records only if needed for testing.
- Add tests around tenant isolation and permission boundaries.
- Document remaining localStorage usage after Phase 1.

## Release Alignment

- v0.1.x: Pilot Launch / External Testing
- v0.2.x: Real Data Foundation
- v0.3.x: Customer Persistence
- v0.4.x: Customer & Household Operations
- v0.5.x: Memberships & Check-In
- v0.6.x: Programs & Registrations
- v0.7.x: Pilot Customer Release
- v1.0.0: Production Ready

## Non-Goals For This Foundation

- Do not migrate additional workflow data yet.
- Do not add production authentication yet.
- Do not change application workflows.
- Do not remove mock persistence until replacement server-backed domains exist.
