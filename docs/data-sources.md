# Data Sources

Cairn v0.3.0 documents which modules are database-backed today and which modules still rely on demo storage.

This is both a readiness inventory and the current source-of-truth audit for migrated workflows. It should be reviewed before any future Neon schema or workflow migration work.

## Status Legend

- `Neon-backed`: A durable Neon schema and server repository/read path exists for at least the current foundation behavior.
- `Demo-backed`: The module uses seeded mocks and local mock state for operational behavior.
- `Local-only`: The module persists browser-local admin/settings/integration state and is not production-authoritative.
- `Not Yet Migrated`: No production storage path exists yet.

## Inventory

| Module | Current Source | Status | Notes |
|---|---|---|---|
| Organizations | Neon `organizations`, repository reads, Drizzle seed data, seed fallback in `db/tenant.ts` | Neon-backed | Organizations are root tenants and own `data_mode`. Platform admin provisioning still uses local registry state. |
| Facilities | Neon `facilities`, organization-scoped repository reads, seed fallback in `db/tenant.ts` | Neon-backed | Facility lookup requires organization scope; facility slugs are not treated as globally authoritative. |
| Staff | Neon `staff_users`, `staff_roles`, `staff_facility_access`; mock auth remains separate | Neon-backed | Staff records are database-backed for read-only validation. Production authentication and permission enforcement are future work. |
| Customers | Neon `customers`, organization-scoped repositories, and server actions | Neon-backed | Customer list/detail/create/edit/delete are fully persistent for modeled profile fields. Membership, waiver, check-in, merge, and richer profile fields remain future migrations. |
| Households | Neon `households`, customer `household_id` links, organization-scoped repositories, and server actions | Neon-backed | Household list/detail/create/edit/delete and primary-contact assignment are fully persistent. Rich relationship roles, billing behavior, and membership behavior remain future migrations. |
| Memberships | `lib/mocks/memberships.ts`, access records, punch passes, and `customer-state` local mock persistence | Demo-backed | No Neon schema or repository layer yet. |
| Check-ins | `lib/mocks/checkins.ts` and `customer-state` local mock persistence | Demo-backed | Occupancy/check-in behavior is local demo state. |
| Programs | `lib/mocks/programs.ts`, public program helpers, and local mock state | Demo-backed | Program/session data is not server-authoritative. |
| Registrations | `lib/mocks/registrations.ts`, program mocks, and local mock state | Demo-backed | Registration and waitlist writes are not migrated. |
| POS | Product and transaction mocks, POS helpers, and local mock state | Demo-backed | Products, carts, receipts, refunds, and inventory are not migrated. |
| Waivers | Waiver template mocks, signed waiver mocks, public waiver helpers, and local mock state | Demo-backed | Waiver templates, versions, signed records, and signature audit snapshots are not migrated. |
| Reporting | `lib/reports/metrics.ts` over mock/local workflow data; saved report UI state in localStorage | Demo-backed | Reports are only as durable as their source workflow data. |
| Settings | `lib/state/settings-state.tsx` local mock persistence | Local-only | Facility profile, roles, permissions, branding, and operations settings are not production-authoritative. |
| Integrations | `lib/integrations/storage.ts` localStorage | Local-only | Connections, webhooks, deliveries, and integration audit events are browser-local today. |
| Platform Admin Registry | `lib/state/platform-admin-state.tsx`, `lib/platform-admin/registry.ts`, localStorage, and cookies | Local-only | Demo organizations are merged client-side; real provisioning must move server-side before production tenants. |

## Repository Scope Audit

The current repository layer is intentionally narrow:

- `db/repositories/organization-repository.ts` provides platform/root tenant reads by slug and platform-wide counts.
- `db/repositories/facility-repository.ts` requires `organizationId` for facility slug lookup and organization facility lists.
- `db/repositories/staff-repository.ts` has platform-wide admin reads plus organization-scoped and facility-scoped staff reads.
- `db/repositories/customer-repository.ts` has platform/admin reads plus organization-scoped customer list, search, create, edit, delete, and count helpers.
- `db/repositories/household-repository.ts` has platform/admin reads plus organization-scoped household list, create, edit, delete, customer-link clearing, and count helpers.

Tenant-facing pages should use scoped repository helpers after resolving the active organization through `db/tenant.ts`. Platform admin pages may use cross-tenant reads only for explicit platform visibility.

## Organization Scoping Findings

- Durable foundation tables include `organization_id` where expected for facilities, staff roles, staff users, customers, and households.
- `facilities` has a unique index on `organization_id + slug`, preventing facility slugs from becoming global tenant keys.
- `staff_users` has a unique index on `organization_id + email`, avoiding accidental cross-tenant email uniqueness assumptions.
- Customer and household list/detail/create/edit/delete paths resolve the active organization before reading or writing Neon rows.
- Demo fallback data is separated by organization id and `data_mode`, but fallback/demo state is not production-authoritative.
- Platform admin organization provisioning still persists browser-local registry records and must be replaced before real customer provisioning.

No obvious tenant-facing repository query was found reading operational data without an organization boundary. The remaining broad reads are platform-admin or count visibility surfaces.

## Planned Migration Order

1. Platform provisioning: replace local platform registry with server-backed organization/facility provisioning.
2. Customer and household follow-up: imports, merge workflows, richer profile fields, relationship roles, audit events, and rollback paths.
3. Memberships and access records: plans, passes, freezes, renewals, membership cards, and eligibility rules.
4. Check-ins and occupancy: check-in sessions, overrides, capacity, and attendance audit trails.
5. Programs and registrations: programs, sessions, instructors, registrations, waitlists, and public checkout links.
6. POS and products: products, inventory, carts, receipts, refunds, and transaction history.
7. Waivers: templates, versions, signed records, guardian signatures, and immutable signature snapshots.
8. Reporting: server-side attendance, revenue, membership, program, and operational reporting from durable source data.
9. Settings, integrations, support, notifications, and audit logs.

## Admin Visibility

The platform admin inventory is available at `/admin/data-sources`.

The database health page at `/admin/database` reports:

- connection status
- known table count
- record counts by table
- customer and household record counts
- last committed Drizzle migration from `db/migrations/meta/_journal.json`
- seed data status for the current database foundation
- last seed run status, shown as unavailable until a dedicated seed-run audit table exists
