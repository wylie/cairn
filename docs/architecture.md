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

## Database Foundation

v0.2.x establishes the production database foundation without migrating application workflows yet.

### Current State

- Staff, customer, facility, and platform workflows still run on seeded mocks and localStorage-backed demo persistence.
- Existing UI behavior is unchanged while the database foundation is introduced.
- localStorage remains acceptable only for harmless UI preferences and short-lived drafts going forward.

### New State

- `drizzle-orm`, `drizzle-kit`, and `postgres` are installed for the production data layer.
- `drizzle.config.ts` points Drizzle at the schema in `db/schema` and migrations in `db/migrations`.
- `DATABASE_URL` is the documented connection string for Neon PostgreSQL.
- `db/index.ts` exposes a typed Drizzle database client without requiring application workflows to use it yet.
- `db/schema` contains the initial tenant and staff foundation: organizations, facilities, staff users, staff roles, and staff facility access.
- `db/seed.ts` seeds the initial organizations and facilities for Summit Rec Collective, Riverstone Nature Center, and Western Carolina YMCA Association.
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
- Public facility landing metadata and display context can load organization and facility records through the server data layer.
- `db/repositories` contains the first explicit repository layer for organization and facility reads.
- `/admin/database` provides a read-only internal connection and record-count status page.
- Existing demo seed data remains as a fallback so local review environments do not require a live database.
- Tenant helpers require organization context for facility reads. Facility slugs are not treated as globally authoritative.
- Platform-wide organization views are still mock/localStorage-backed until a dedicated platform admin migration replaces the current registry.

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
- Staff access must be filtered by allowed organizations and facilities.
- Customer portal access must be limited to the authenticated customer and authorized household members.
- Platform admin access must remain separate from organization staff access.
- Cross-tenant reads must only exist in explicit platform admin or support contexts.
- Privileged reads and writes must enforce permissions server-side, not only in UI navigation.

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

See [Data Migration Plan](./data-migration-plan.md) for the detailed audit and migration roadmap, and [Real Data Implementation Plan](./real-data-implementation-plan.md) for the v0.2.x implementation sequence.

## Integration Readiness

- `TODO(auth)` marks authentication replacement points.
- Existing `TODO(supabase)` markers should be treated as general data-layer migration markers until implementation renames them for the selected database architecture.
- `TODO(stripe)` marks billing and subscription integration points.
