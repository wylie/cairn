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

## New State: Database Foundation Established

v0.2.x now includes the first production data foundation pieces.

- Drizzle ORM, Drizzle Kit, and the `postgres` client are installed.
- `DATABASE_URL` is documented in `.env.example` for Neon PostgreSQL connections.
- `drizzle.config.ts` defines schema and migration paths.
- `db/schema` contains intentionally minimal tables for organizations, facilities, staff users, staff roles, and staff facility access.
- `db/migrations` contains the initial SQL migration generated from the schema.
- `db/index.ts` exposes the typed database client.
- `/api/internal/database-health` verifies whether the configured database connection is reachable without exposing credentials or connection details.

This foundation does not change existing application behavior. Current workflows still use the mock/localStorage implementation until future migration work replaces each domain intentionally.

## Organization & Facility Persistence Started

Organizations and facilities are the first data area wired toward the production database.

- `npm run db:seed` seeds the initial tenant foundation into the configured database.
- Seeded organizations: Summit Rec Collective, Riverstone Nature Center, and Western Carolina YMCA Association.
- Seeded facilities include each organization's initial facility records and slugs.
- `db/tenant.ts` provides server-side Drizzle helpers for organization lookup, facility lookup, organization-scoped facility lists, and active facility context.
- Facility lookup requires organization scope so facility slugs do not become global tenant bypasses.
- The public facility landing page can read organization and facility display data from the database when available.
- If `DATABASE_URL` is missing or the database query fails, the same helpers fall back to canonical demo seed data so local demo mode remains stable.

This does not migrate customers, households, memberships, programs, registrations, POS, waivers, notifications, support requests, or authentication. Those areas still use the existing mock/localStorage implementation until their planned migration phases.

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

- Map current `lib/state/*` providers to future server-backed domains.
- Mark which localStorage keys can be retired, migrated, or kept as UI preferences.
- Confirm tenant scope for each domain: organization-level, facility-level, customer-level, or platform-level.

### 2. Schema Foundation

Goal: define the first durable database model without changing workflows yet.

Deliverables:

- Add Neon PostgreSQL connection configuration through `DATABASE_URL`.
- Add Drizzle schema for organizations, facilities, staff users, staff roles, and staff facility access.
- Define IDs, tenant keys, timestamps, and initial relational constraints.
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
- Persist staff users, roles, permissions, and facility assignments.
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
- v0.3.x: Feedback & Usability
- v0.4.x: Customer Migration & Onboarding
- v0.5.x: Operations & Staff Experience
- v0.6.x: Pilot Customer Release
- v0.7.x: Mobile & Member Experience
- v1.0.0: Production Ready

## Non-Goals For This Foundation

- Do not migrate data yet.
- Do not add production authentication yet.
- Do not change application workflows.
- Do not remove mock persistence until replacement server-backed domains exist.
