# Data Sources

Cairn v0.4.1 documents which modules are database-backed today and which modules still rely on demo storage.

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
| Customers | Neon `customers`, organization-scoped repositories, and server actions | Neon-backed | Customer list/detail and modeled profile reads are fully persistent. Membership and check-in history now read persisted records. Waiver, merge, imports, communications, documents, and audit events remain future migrations. |
| Customer Search | Neon `customers`, `searchCustomers(organizationId, query)`, and server-rendered customer list queries | Neon-backed | Search is organization-scoped and supports normalized partial matching on first name, last name, preferred name, member ID, email, phone, and full name. It does not fall back to localStorage or hardcoded records. |
| Customer Create/Edit/Delete | Neon `customers`, customer server actions, and organization-scoped repository mutations | Neon-backed | Create/edit/delete are fully persistent for modeled profile fields. Validation, duplicate warnings, and household primary-contact cleanup are handled before mutation. |
| Households | Neon `households`, customer `household_id` links, organization-scoped repositories, and server actions | Neon-backed | Household list/detail and member display are fully persistent. Household memberships now persist through membership ownership records. Rich relationship roles and billing behavior remain future migrations. |
| Household Create/Edit/Delete | Neon `households`, customer `household_id` links, household server actions, and repository mutations | Neon-backed | Household create/edit/delete, member add/remove, and primary-contact assignment are fully persistent. Deleting a household clears member links without deleting customers. |
| Customer-Household Relationships | Neon `customers.household_id` with `ON DELETE SET NULL`, organization-scoped repositories, and server actions | Neon-backed | A customer can belong to zero or one household. Removing a member clears the link without deleting the customer. Deleting a household clears member links without deleting customers. |
| Memberships | Neon `membership_plans` and `memberships`, organization/facility-scoped repositories, and server actions | Neon-backed | Membership plans, individual memberships, household memberships, dates, active/expired/cancelled/suspended states, customer profile visibility, extension, status changes, duplicate-active prevention, and access-rule lookup are persistent. Payment processing, freezes, billing, and card events remain future work. |
| Check-ins | Neon `check_ins`, organization/facility-scoped repositories, and server actions | Neon-backed | Customer check-in, check-out, currently-in roster, today history, customer profile history, staff override records, access-denial messaging, duplicate active check-in prevention, and admin diagnostics are persistent. Capacity rules, automatic closeout, backdated corrections, and waiver-backed blocks remain future work. |
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
- `db/repositories/customer-repository.ts` has platform/admin metrics plus organization-scoped customer list, single-customer reads, normalized search, create, edit, delete, duplicate-warning, last-created, data-mode counts, active/inactive counts, potential duplicate count, and count helpers.
- `db/repositories/household-repository.ts` has platform/admin metrics plus organization-scoped household list, single-household reads, create, edit, delete, member reads, member add/remove, primary-contact updates, duplicate checks, customer-link clearing, and count helpers.
- `db/repositories/membership-repository.ts` has organization/facility-scoped plan reads, membership create/read/update/extend/status transitions, duplicate-active checks, customer membership lookups, detailed access decisions, and platform/admin counts.
- `db/repositories/check-in-repository.ts` has organization/facility-scoped check-in, check-out, active roster, today history, customer history, duplicate-active prevention, detailed denial messaging, and platform/admin counts.

Tenant-facing pages should use scoped repository helpers after resolving the active organization through `db/tenant.ts`. Platform admin pages may use cross-tenant reads only for explicit platform visibility.

## Organization Scoping Findings

- Durable foundation tables include `organization_id` where expected for facilities, staff roles, staff users, customers, and households.
- `facilities` has a unique index on `organization_id + slug`, preventing facility slugs from becoming global tenant keys.
- `staff_users` has a unique index on `organization_id + email`, avoiding accidental cross-tenant email uniqueness assumptions.
- Customer list/detail/create/edit/delete/search paths resolve the active organization before reading or writing Neon rows.
- Customer search trims and normalizes input, supports partial matching across first name, last name, preferred name, member ID, email, and phone, and does not search browser-local customer state in persisted mode.
- Customer and household repository list/search reads order by stable ID tie-breakers after user-facing fields so repeated queries remain deterministic.
- Customer create/edit validations are shared across server actions and forms for required fields, email format, phone normalization, birth-date validity, and US state format.
- Duplicate-customer checks warn on exact email, exact normalized phone, or matching name plus birth date within the active organization; staff may review the possible match and save anyway when appropriate. Merge remains future work.
- Customer and household server actions return staff-readable errors when Neon is unavailable or behind committed migrations.
- Customer records are no longer hydrated from or saved to the customer localStorage mock key.
- Customer and household list/detail/create/edit/delete paths resolve the active organization before reading or writing Neon rows and no longer fall back to mock records when the Neon context is unavailable in the app.
- Household member add/remove and primary-contact changes resolve the active organization before writing Neon rows.
- Customer delete and household create/edit/delete/member changes use transactional repository writes when multiple rows are affected.
- Household primary-contact repository mutations validate organization ownership and household membership before writing primary-contact state.
- Household records and relationship links are no longer hydrated from or saved to household localStorage mock keys.
- Membership records require organization scope, support facility-specific scope when present, and are owned by either one organization-owned customer or one organization-owned household.
- Active access checks are centralized in the membership repository and evaluate persisted membership status, date windows, facility scope when present, and customer/household ownership. Decisions distinguish allowed, allowed-with-warning, expired, suspended, cancelled, future, missing, and wrong-facility access.
- Check-in writes validate customer and facility organization ownership before insert, prevent duplicate active check-ins for the same organization/customer, and reject check-out requests without an active check-in.
- Membership cancellation or suspension changes membership status without deleting membership or check-in history.
- Membership access and attendance queries are supported by focused indexes in `0008_membership_checkin_stabilization_indexes.sql`.
- Demo fallback data is separated by organization id and `data_mode`, but fallback/demo state is not production-authoritative.
- Platform admin organization provisioning still persists browser-local registry records and must be replaced before real customer provisioning.

No obvious tenant-facing repository query was found reading operational data without an organization boundary. The remaining broad reads are platform-admin or count visibility surfaces.

## Planned Migration Order

1. Platform provisioning: replace local platform registry with server-backed organization/facility provisioning.
2. Customer and household follow-up: imports, merge workflows, richer profile fields, relationship roles, audit events, and rollback paths.
3. Membership follow-up: renewals, payment-backed sales, freezes, billing, card events, and richer membership reporting.
4. Check-in follow-up: capacity rules, backdated corrections, automatic closeout, waiver-backed blocks, attendance audit trails, and reporting.
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
- active and inactive customer counts
- demo, sandbox, and production customer counts
- searchable customer count
- customers assigned to households and customers without households
- potential duplicate customer pairs
- membership plan, total membership, active membership, expired membership, and suspended membership counts
- check-ins today, currently checked in, and check-in history counts
- last customer created and customer seed count
- last committed Drizzle migration from `db/migrations/meta/_journal.json`
- seed data status for the current database foundation
- last seed run status, shown as unavailable until a dedicated seed-run audit table exists
