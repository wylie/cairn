# Architecture

Cairn is a responsive Next.js App Router application organized around multi-tenant facility operations. The current implementation is optimized for pilot demos and external testing; the target architecture moves operational data to durable server-backed persistence.

## Current Architecture

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style reusable primitives

### Structure

- `app/` route-based pages and route handlers
- `components/layout` app shell and navigation
- `components/shared` reusable page-level building blocks
- `components/customers`, `components/checkins`, and other domain UI
- `lib/mocks` static seeded demo data
- `lib/state` client mock workflow state
- `lib/data` selectors and search logic

### Mock Storage

Cairn currently uses seeded mock data plus browser persistence.

- `lib/mock-storage.ts` wraps `window.localStorage` and stores scoped mock records under `cairn.mock.<organizationId>.<locationId>.<bucket>`.
- `lib/state/customer-state.tsx` owns most operational workflow state: customers, households, memberships, billing, check-ins, POS, products, programs, sessions, registrations, waivers, rentals, communications, alerts, tasks, and membership card events.
- `lib/state/settings-state.tsx` persists facility profile, locations, roles, permissions, access rules, branding, notification settings, calendar settings, and operations settings.
- `lib/state/workstation-state.tsx` persists active staff, staff users, and workstation audit entries.
- `lib/state/platform-admin-state.tsx` and `lib/platform-admin/registry.ts` persist platform settings and provisioned organization records through localStorage and cookies.
- `lib/state/support-state.tsx` persists support requests, support audit entries, and support impersonation sessions in localStorage.
- `lib/integrations/storage.ts` persists integration connections, webhook endpoints, audit events, and deliveries in localStorage.

### Mock Authentication

Authentication is mock-only today.

- Staff, platform admin, and support users come from `lib/auth/mock-users.ts`.
- Customer portal users come from `lib/auth/mock-customer-users.ts`.
- The current session is stored in the `cairn_mock_auth` cookie.
- Customer registration stores additional mock customer accounts in the `cairn_mock_customer_accounts` cookie.
- Support sessions are stored in the `cairn_support_session` cookie.

### Demo Environment Goals

The current architecture is intentionally demoable without a database, production authentication provider, payment provider, email provider, SMS provider, or external integration service. This keeps external testing fast while workflows continue to mature.

Browser storage is acceptable for demos and local preferences, but it is not a production source of truth. Production usage requires shared, durable, server-authorized records for tenant isolation, auditability, multi-device consistency, imports, reporting, and support access.

## Target Architecture

Preferred target:

```text
Browser
  |
Next.js
  |
Route Handlers / Server Actions
  |
Drizzle ORM
  |
Neon PostgreSQL
```

### Production Data Persistence

Neon PostgreSQL should become the durable source of truth for organization, facility, staff, customer, household, membership, registration, waiver, transaction, support, notification, and audit records.

Drizzle should define the schema and typed query layer. Next.js Route Handlers and Server Actions should own server-side reads and writes so tenant scope, role permissions, and support access checks happen before any database mutation.

localStorage should remain limited to non-authoritative UI preferences and drafts such as calendar view preference, report filter session state, and pre-checkout cart drafts.

## Version Metadata

`lib/version.ts` is the source of truth for shipped version metadata through the `version` object.

- `currentVersion` identifies the shipped application version shown in app chrome.
- `releaseName` describes the shipped release.
- `releaseDate` records the date the version shipped.
- `releaseType` records the SemVer increment type.
- `summary` provides the short release summary.

The footer, Release Notes page, Roadmap page, admin version displays, version chips, and "What's New" surfaces should read from this metadata rather than hardcoding active version strings. Historical release notes keep their own shipped version data in release-note entries.

Cairn uses CI/CD release discipline with Semantic Versioning. `main` should remain deployable, version numbers track shipped software, Release Notes document shipped versions, and the Roadmap documents future milestones.

## Database Foundation

v0.2.x is limited to the Real Data Foundation: organizations, facilities, staff, customers, households, demo/production separation, and versioning. Customer editing, memberships, check-ins, programs, POS, and production authentication move to later releases.

### Current State

- Staff, customer, facility, and platform workflows still run on seeded mocks and localStorage-backed demo persistence.
- Existing UI behavior is unchanged while the database foundation is introduced.
- localStorage remains acceptable only for harmless UI preferences and short-lived drafts going forward.

### New State

- `drizzle-orm`, `drizzle-kit`, and `postgres` are installed for the production data layer.
- `drizzle.config.ts` points Drizzle at the schema in `db/schema` and migrations in `db/migrations`.
- `DATABASE_URL` is the documented connection string for Neon PostgreSQL.
- `db/index.ts` exposes a typed Drizzle database client without requiring application workflows to use it yet.
- `db/schema` contains the initial tenant, staff, customer, and household foundation: organizations, organization data classification, facilities, staff users, staff roles, staff role assignment, staff facility access, customers, and households.
- `db/seed.ts` seeds the initial organizations, facilities, staff, customers, and households for Summit Rec Collective, Riverstone Nature Center, and Western Carolina YMCA Association.
- `db/tenant.ts` provides server-side Drizzle reads for organization and facility context, with demo seed fallback when the database is unavailable.
- `/api/internal/database-health` checks whether the configured database connection is available and returns only `connected` or `disconnected` status.

### Migration Workflow

Database changes are managed through Drizzle Kit.

- `npm run db:generate` generates SQL migrations from `db/schema`.
- `npm run db:migrate` applies pending migrations to the database identified by `DATABASE_URL`.
- `npm run db:studio` opens Drizzle Studio against the configured database for local inspection.
- `npm run db:seed` seeds the initial organization and facility records after migrations have been applied.

Local database tooling loads `DATABASE_URL` from `.env.local`. `DATABASE_URL` must remain server-only. Do not expose it through browser code, `NEXT_PUBLIC_*` variables, or client components.

### First Database-Backed Area

Organizations and facilities are the first Cairn data area to read from the production database where safe.

- The database owns seeded organization and facility identities when `DATABASE_URL` is configured and migrations have run.
- `organizations.data_mode` classifies each tenant as `demo`, `sandbox`, or `production`.
- Public facility landing metadata and display context can load organization and facility records through the server data layer.
- `db/repositories` contains the first explicit repository layer for organization and facility reads.
- `/admin/database` provides read-only internal connection status, table count, record counts by table, migration metadata, and seed data status.
- `/admin/data-sources` provides platform-admin visibility into which modules are Neon-backed, demo-backed, local-only, or not yet migrated.
- Existing demo seed data remains as a fallback so local review environments do not require a live database.
- Tenant helpers require organization context for facility reads. Facility slugs are not treated as globally authoritative.
- Platform-wide organization views are still mock/localStorage-backed until a dedicated platform admin migration replaces the current registry.

### Data Classification

Organization is the primary data boundary in Cairn. Every durable record beneath an organization inherits that organization's data mode.

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

Data modes:

- `demo`: Cairn-owned sample organizations used for demos, screenshots, testing, documentation, and sales presentations.
- `sandbox`: client-owned testing environments used for onboarding, training, and experimentation.
- `production`: real operational customer data used for live facilities, memberships, check-ins, waivers, registrations, and reporting.

Rules:

- Demo organizations contain only demo data.
- Sandbox organizations contain only sandbox data.
- Production organizations contain only production data.
- Never mix demo and production data in the same organization.
- Customer and household migration work must create or target the correct organization before importing records.

Visibility:

- Normal staff and facility workflows show a subtle `Demo` badge for demo organizations and a `Sandbox` badge for sandbox organizations.
- Demo organizations also show a dismissible banner explaining that the organization contains demonstration data for evaluation purposes.
- Production organizations are not prominently labeled in normal facility workflows.
- Platform Admin organization lists and details show all data modes, including `Production`.

### Staff Account Foundation

Staff accounts are now represented in Neon as production data foundations, but production login remains out of scope.

- `staff_users.organization_id` requires every staff account to belong to exactly one organization.
- `staff_users.role_id` links a staff user to an organization-owned staff role when available.
- `staff_facility_access` maps staff users to the facilities they can access.
- `db/repositories/staff-repository.ts` provides server-only reads for all staff users, one staff user, staff by organization, and staff by facility.
- `/admin/staff` displays a read-only database-backed staff directory for internal validation.

Future authentication work should authenticate staff through a production provider, resolve the staff user from the database, then derive organization, role, permission, and facility scope server-side before any protected read or write.

### Customer & Household Foundation

Customers and households now have database-backed profile workflows for modeled fields. Customer and household list/detail/create/edit/delete operations use Neon through server actions and repository helpers, while memberships, check-ins, waivers, programs, POS, and authentication still use the existing demo persistence.

- `customers.organization_id` requires every customer to belong to one organization.
- `customers.household_id` is nullable so individual customers can exist before household relationships are assigned.
- `households.organization_id` requires every household to belong to one organization.
- `households.primary_contact_id` is nullable so household records can be created before a primary contact is selected.
- `db/repositories/customer-repository.ts` and `db/repositories/household-repository.ts` provide server-only read, write, delete, and count helpers.
- `/admin/database` reports customer and household counts from Neon for internal visibility.
- `npm run db:seed` seeds a small fictional customer and household set for each demo organization.

Customer read path:

- The staff customer list and detail pages resolve the active organization from the server-side organization context.
- The pages read customers through `db/repositories/customer-repository.ts`.
- Customer creates, edits, and deletes call server actions that resolve organization context before repository writes.
- Customer reads and writes are organization-scoped before rows are mapped into the existing customer UI.
- If the database path is unavailable, the client list falls back to existing demo state for local demo stability.
- If no customer rows exist, the list shows a friendly empty state instead of surfacing a database error.

Household read path:

- The staff household list and detail pages resolve the active organization from the server-side organization context.
- The pages read households through `db/repositories/household-repository.ts`.
- Household creates, edits, and deletes call server actions that resolve organization context before repository writes.
- Household reads and writes are organization-scoped before rows are mapped into the existing household workspace UI.
- Primary-contact metadata and household membership display are derived from organization-scoped customer reads where available.

Current migration status:

- Customer list, detail, create, edit, and delete are backed by Neon for modeled profile fields.
- Household list, detail, create, edit, and delete are backed by Neon for modeled household fields.
- Customer merge, membership, check-in, waiver, registration, POS, richer household relationships, and billing workflows are not migrated yet.
- The existing client state provider remains in place for operational actions until server-backed write paths exist.
- The v0.3.0 data-source audit is documented in [Data Sources](./data-sources.md) and exposed internally at `/admin/data-sources`.

Customer ownership rules:

- A customer inherits data mode from the owning organization.
- Customer search must remain organization-scoped.
- Customer portal access should eventually resolve to the authenticated customer and authorized household members before reading records.
- Production customer records should enter through import/onboarding or server-authorized create workflows, not demo seed scripts.

Household ownership rules:

- A household inherits data mode from the owning organization.
- Household membership should be derived from organization-owned customers.
- Future memberships can attach to either a household or customer depending on the product model, but the owning organization must remain explicit.
- Household billing, emergency contacts, and primary contact behavior should be modeled in later migrations after the customer foundation is validated.

Target ownership model:

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

### Future State

- Future releases will move workflow domains behind the Next.js server/data layer incrementally.
- Customer, household, membership, program, registration, waiver, POS, rental, notification, and support records remain unmigrated until their planned phases.
- Existing localStorage-backed flows should be retired only after replacement server-backed reads and writes exist for the relevant domain.

### Multi-Tenant SaaS Model

Target hierarchy:

```text
Organization
  |
Facilities
  |
Customers / Staff / Programs / Transactions
```

Tenant expectations:

- Every durable domain record must include an `organizationId`.
- Facility-scoped records must include a `facilityId` or location equivalent.
- All organization-owned records inherit the parent organization's `data_mode`.
- Staff access must be filtered by allowed organizations and facilities.
- Staff users belong to one organization; cross-organization staff access should be modeled explicitly rather than inferred from email.
- Facilities belong to one organization, which gives future customer, household, membership, and transaction records a clear tenant boundary.
- Customer portal access must be limited to the authenticated customer and authorized household members.
- Platform admin access must remain separate from organization staff access.
- Cross-tenant reads must only exist in explicit platform admin or support contexts.
- Privileged reads and writes must enforce permissions server-side, not only in UI navigation.

Repository audit findings:

- Facility repository slug lookup requires `organizationId`.
- Customer and household tenant-facing list reads resolve active organization before querying.
- Staff repositories include platform-wide admin reads plus organization-scoped and facility-scoped reads.
- Platform-wide counts and lists are acceptable only for platform admin/database visibility.
- Demo fallback data remains useful for local review, but cannot be treated as production data.

### Support Access

Support access should be a durable, auditable platform workflow.

- Cairn support users authenticate separately from facility staff.
- Starting a support session requires organization scope and a reason.
- Support sessions are time-bound and visible to facility administrators.
- Support actions are written to audit logs.
- Future impersonation should preserve the acting support user, impersonated user when applicable, organization/facility scope, reason, start/end times, and sensitive actions.

## Migration Direction

The data migration should be phased:

- Phase 1: identity, organizations, facilities, staff users, roles, and permissions
- Phase 2: customers, households, emergency contacts, and memberships
- Phase 3: programs, sessions, registrations, attendance, and waitlists
- Phase 4: check-ins, POS transactions, products, rentals, and waivers
- Phase 5: notifications, support requests, release notifications, and audit logs

See [Data Sources](./data-sources.md) for the current storage inventory, [Data Migration Plan](./data-migration-plan.md) for the detailed audit and migration roadmap, and [Real Data Implementation Plan](./real-data-implementation-plan.md) for the v0.2.x implementation sequence.

## Integration Readiness

- `TODO(auth)` marks authentication replacement points.
- Existing `TODO(supabase)` markers should be treated as general data-layer migration markers until implementation renames them for the selected database architecture.
- `TODO(stripe)` marks billing and subscription integration points.
