# Data Migration Plan

Cairn is currently demo-ready through seeded data and browser-backed mock persistence. The next architecture milestone is to replace browser state as the source of truth with a real multi-tenant SaaS data foundation.

This plan documents the current persistence audit and the phased migration path. It does not implement the migration, add database code, or change application behavior.

## Current Persistence Audit

### Already Server Backed

No durable production application data is server backed today.

Current server-side routes support mock login, logout, customer registration, public occupancy, and the versioned API foundation, but they do not write to a durable production database. Auth state is represented by encoded cookies, and domain data remains seeded or browser persisted.

### Mock / localStorage

Most operational data is hydrated from `lib/mocks/*` and persisted in browser storage after user interaction.

Primary storage helpers:

- `lib/mock-storage.ts` stores scoped mock state under `cairn.mock.<organizationId>.<locationId>.<bucket>`.
- `lib/state/customer-state.tsx` persists operational workflow data under scoped mock keys.
- `lib/state/settings-state.tsx` persists organization and facility settings under `cairn.mock.<organizationId>.settings.v1`.
- `lib/state/workstation-state.tsx` persists active staff, staff users, and audit log data under scoped mock keys.
- `lib/state/platform-admin-state.tsx` persists platform settings under `cairn_platform_settings_v1`.
- `lib/platform-admin/registry.ts` persists provisioned organizations in `cairn_platform_org_registry` and the `cairn_org_registry` cookie.
- `lib/state/support-state.tsx` persists support requests, support audit events, and support impersonation sessions under `cairn_support_*_v1` keys.
- `lib/integrations/storage.ts` persists integration connections, webhooks, audit events, and deliveries under `cairn_<organizationId>_integrations_<suffix>`.

Domain data currently persisted through local mock state includes:

- organizations and provisioned organization metadata
- facilities, locations, branding, settings, roles, and permissions
- staff users, active staff workstation context, PIN switching state, and audit entries
- customers, households, household members, emergency/contact details, and customer profile changes
- memberships, punch passes, access records, billing accounts, credits, invoices, statements, renewals, and refunds
- programs, sessions, registrations, registration activity, attendance, and waitlist-oriented activity
- check-ins, occupancy history, membership card events, operations alerts, manual alerts, and operations tasks
- POS products, product categories, transactions, receipts, inventory audit entries, and refunds
- waivers, waiver templates, waiver versions, and signed waiver records
- rentable resources, reservations, and maintenance blocks
- communications, notifications, internal notes, generated release notifications, and support-session notices
- integrations, webhook endpoints, webhook deliveries, and integration audit entries

### Mock Authentication And Cookies

Authentication is mock-only today.

- `lib/auth/mock-users.ts` contains staff, platform admin, and support staff login identities.
- `lib/auth/mock-customer-users.ts` contains seeded customer portal identities and stores registered mock customer accounts in the `cairn_mock_customer_accounts` cookie.
- `lib/auth/session.ts` stores the current mock session in the `cairn_mock_auth` cookie.
- `lib/support/session.ts` stores support impersonation state in the `cairn_support_session` cookie.
- `lib/tenant/client.ts` reads `cairn_org_slug` and mock auth cookies to derive tenant context in the browser.

These cookies are useful for demo flows but are not a production identity, authorization, or tenant-isolation model.

### Can Remain Local

Some data can remain browser local because it is a user preference, draft, or short-lived UI state. These values should not become the source of truth for business records.

- Calendar view preference: `cairn:calendar:view`
- Report page session filters/search: `cairn.analytics.session`
- Public cart draft before checkout: `cairn_public_cart_<orgSlug>`
- Support notice session dedupe flags: `cairn_support_notice_<sessionId>`
- Dismissed announcements, sidebar collapse state, table density, sort preferences, and similar future UI preferences
- Non-authoritative saved report filters, if treated as personal shortcuts rather than shared reporting assets

### Requires Migration

The following data must move to durable server-backed storage before production use:

- organizations, facilities, locations, provisioning state, and subscription/support metadata
- staff users, staff auth identities, roles, permissions, staff PINs, and staff audit logs
- customers, households, household members, contact details, emergency contacts, and privacy scopes
- memberships, passes, access records, billing records, invoices, credits, statements, renewals, and refunds
- programs, sessions, registrations, attendance, waitlists, transfers, and registration activity
- waivers, waiver templates, waiver versions, signatures, and guardian authorization records
- check-ins, check-outs, occupancy history, operational alerts, and operations tasks
- POS products, product categories, transactions, receipts, returns, refunds, and inventory changes
- rentals, rentable resources, reservations, and maintenance blocks
- communications, notification delivery state, internal notes, release notifications, and customer/staff message history
- support requests, support audit events, support impersonation sessions, and platform support visibility
- integrations, webhook endpoints, delivery logs, and integration audit events

## Recommended Future Architecture

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

### Why This Architecture

- Next.js already owns Cairn routing, portals, layouts, and server route boundaries.
- Route Handlers and Server Actions keep writes behind server-side authorization checks instead of exposing database access to the browser.
- Drizzle provides typed schema definitions and query construction without forcing a heavyweight runtime abstraction.
- Neon PostgreSQL gives Cairn a managed relational database suited to multi-tenant operational records, transactions, reporting, and audit trails.
- PostgreSQL fits Cairn's relationships: organizations, facilities, staff, customers, households, memberships, programs, registrations, waivers, transactions, and support records all need relational integrity.

### Why localStorage Is Not Production Appropriate

Browser storage is acceptable for demos and preferences, but it is not suitable for production business data.

- It is device-specific, so staff at different workstations do not share a reliable source of truth.
- It can be cleared, overwritten, or corrupted by the browser.
- It cannot enforce tenant isolation, role permissions, or support access boundaries.
- It cannot support durable audit trails for staff, support, payments, waivers, or customer changes.
- It cannot safely coordinate concurrent operations like registrations, check-ins, inventory, refunds, or waitlist moves.
- It cannot support reliable imports, reporting, backups, recovery, or compliance review.

## Multi-Tenant Architecture

Target tenant hierarchy:

```text
Organization
  |
Facilities
  |
Customers / Staff / Programs / Transactions
```

### Tenant Isolation Expectations

- Every durable domain record must carry an `organizationId`.
- Facility-scoped records must also carry a `facilityId` or equivalent location scope.
- All reads and writes must be filtered by the authenticated user's allowed organization and facility access.
- Staff permissions must be evaluated server-side for every mutation and privileged read.
- Customer portal reads must be limited to the authenticated customer and authorized household members.
- Platform admin access must be separate from organization staff access.
- Cross-tenant reporting should only exist in explicit platform admin contexts.

### Support Access Expectations

Support access should be a separate role and workflow, not a hidden override inside organization staff accounts.

- Support staff must authenticate as Cairn support users.
- Support sessions must require a selected organization, reason, start time, and support staff identity.
- Facility owners/managers should be able to see that a support session occurred.
- Support activity must be written to durable audit logs.
- Support access should be time-bound and revocable.
- Support users should receive the minimum access needed for the support task.

### Future Support Impersonation

Future impersonation should preserve the difference between "acting as support" and "acting as a facility user."

- Prefer "support session viewing organization data" over silently becoming another user.
- If true impersonation is required, log the actor, impersonated user, organization, facility scope, reason, start/end times, and all sensitive actions.
- Display visible in-app indicators while a support session is active.
- Notify facility administrators when support access begins.
- Never allow support impersonation to bypass tenant filters, permission checks, or audit logging.

## Migration Phases

### Phase 1: Identity & Organization Foundation

Entities:

- Organization
- Facility
- Staff User
- Roles
- Permissions

Goal:

Establish durable multi-tenant ownership boundaries.

Scope:

- Define the database schema for organizations, facilities, staff users, roles, permissions, and staff-to-facility access.
- Replace provisioned organization browser registry with server-backed organization records.
- Move staff identity and authorization checks behind server-side boundaries.
- Preserve current seeded demo organizations as seed data or fixtures.
- Keep existing UI workflows intact while swapping persistence behind them.

Exit criteria:

- Authenticated staff can only access allowed organizations and facilities.
- Role and permission mutations persist across devices.
- Platform admin organization provisioning writes to the database.
- Staff audit logs are durable.

### Phase 2: Customer Foundation

Entities:

- Customers
- Households
- Emergency Contacts
- Memberships

Goal:

Move core customer records to a shared database.

Scope:

- Store customer profiles, contact details, emergency contacts, household relationships, and membership records in PostgreSQL.
- Add server-side privacy filters for staff and customer portal access.
- Preserve household authorization rules for customer portal views.
- Establish migration scripts or seed import paths for current demo records.

Exit criteria:

- Customer and household changes persist across devices.
- Customer portal access is scoped server-side.
- Membership status is computed from durable records.
- Customer search uses server-backed data.

### Phase 3: Programs & Participation

Entities:

- Programs
- Sessions
- Registrations
- Attendance
- Waitlists

Goal:

Enable real operational workflows.

Scope:

- Store program catalogs, sessions, registration records, attendance, and waitlist state in the database.
- Move registration creation, transfer, duplicate, cancel, and attendance changes to server mutations.
- Enforce capacity and waitlist rules transactionally.
- Keep public program browsing and checkout drafts fast while making completed registrations durable.

Exit criteria:

- Registration and waitlist changes are consistent under concurrent staff/customer usage.
- Attendance state is durable and reportable.
- Public and staff flows share the same source of truth.

### Phase 4: Operations

Entities:

- Check-ins
- POS Transactions
- Products
- Rentals
- Waivers

Goal:

Support day-to-day facility operations.

Scope:

- Store check-ins, check-outs, occupancy history, products, product categories, transactions, receipts, refunds, rentals, reservations, maintenance blocks, waivers, waiver versions, and signed waiver records in the database.
- Move POS and check-in mutations behind server actions or route handlers.
- Enforce waiver, membership, payment, and facility access rules server-side.
- Add durable audit trails for overrides, refunds, waiver signatures, and operational changes.

Exit criteria:

- Front desk workflows work across multiple devices.
- POS, check-in, waiver, and rental records are durable.
- Operational reports read from server-backed records.
- Critical actions have audit entries.

### Phase 5: Platform Services

Entities:

- Notifications
- Support Requests
- Release Notes
- Audit Logs

Goal:

Complete platform-level services.

Scope:

- Store notifications, read/unread state, support requests, support sessions, support audit events, integration audits, webhook deliveries, and platform audit logs in the database.
- Keep release notes file-based until the product needs editable release content, but store generated notification delivery/read state server-side.
- Connect provider adapters for email, SMS, payments, billing, and integrations after durable records exist.

Exit criteria:

- Support requests and support access are durable and visible to the right users.
- Notification state follows users across devices.
- Platform and organization audit logs are queryable.
- Integration delivery records are durable enough for support and retries.

## Cross-Phase Requirements

- No browser storage record should be trusted as authoritative production data.
- Every server mutation must validate organization and facility scope.
- Every privileged mutation must validate permissions server-side.
- Every import or migration script must be repeatable in a test environment before touching production data.
- Existing demo flows should remain available through database seed data.
- Tests should be added phase by phase around authorization, tenant isolation, and critical workflow persistence.

## Risks Identified

- Mock state has grown into a broad application state container, so migration should be incremental rather than a single replacement.
- Some records are currently location-scoped even when the future source of truth may need organization-level or customer-level ownership.
- Cookies currently carry sensitive mock session and registry state that must be replaced with secure auth/session handling.
- Support impersonation exists as browser-managed state and needs durable auditability before real customer data is exposed.
- Notifications and communications share record shapes today; production may need clearer delivery, preference, and read-state tables.
- localStorage-only workflows can hide multi-device and concurrency issues until server-backed persistence is introduced.
