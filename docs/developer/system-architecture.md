# System Architecture

## Overview

Cairn is a multi-tenant facility operations platform built as a responsive Next.js App Router application. The current implementation uses mock data and local persisted client state, but the architecture is intentionally shaped for eventual migration to real backend services.

## Major Experience Layers

### Global / Platform Layer
- `/` global Cairn marketing page
- `/request-demo` demo request form
- `/admin/*` platform administration and organization provisioning

### Facility Public Layer
- `/f/:orgSlug` facility landing page
- `/p/:orgSlug/programs` public program discovery
- `/p/:orgSlug/waivers/:waiverId` public waiver signing
- `/p/:orgSlug/checkout` public registration and checkout flow

### Customer Portal Layer
- `/p/:orgSlug/account/*` authenticated customer self-service area
- mirrored convenience aliases such as `/p/:orgSlug/dashboard`, `/p/:orgSlug/memberships`, `/p/:orgSlug/purchases`

### Staff Portal Layer
- `/o/:orgSlug/*` organization-scoped staff operations

## Frontend Structure
- `app/`: Next.js routes and layouts
- `components/`: domain and shared UI
- `components/ui/`: low-level primitives
- `components/shared/`: cross-domain workflow building blocks
- `lib/`: domain logic, state, mocks, providers, formatting, routing helpers
- `tests/`: Vitest + React Testing Library coverage

## State Model Today

Cairn currently uses a mock-state-first implementation.

- `lib/mocks/*`: seeded organization, customer, staff, membership, program, waiver, transaction, billing, rental, and reporting data
- `lib/state/customer-state.tsx`: central operational state for customers, check-ins, registrations, waivers, communications, billing, rentals, alerts, and more
- `lib/state/workstation-state.tsx`: active staff context, permissions, and staff switching
- `lib/state/settings-state.tsx`: organization settings, branding, calendar, operations, and facility configuration
- `lib/state/platform-admin-state.tsx`: platform admin provisioning state

This keeps flows fully demoable while preserving clear seams for later replacement with database-backed persistence.

## Auth Model Today

### Staff Auth
- mock email/password login via `/login` or `/o/:orgSlug/login`
- quick PIN-based staff switching for workstation workflows

### Customer Auth
- mock email/password login via `/p/:orgSlug/login`
- customer scope limited to self and managed household members

### Platform Admin Auth
- separate mock account with `kind: platform_admin`
- access to `/admin/*`

## Multi-Tenant Routing

Tenant context is derived from the route:

- public facility: `/f/:orgSlug`
- customer portal: `/p/:orgSlug/*`
- staff portal: `/o/:orgSlug/*`

Platform admin routes are intentionally not tied to an organization.

## Key Domain Systems Implemented
- customers and customer profiles
- households
- memberships and access records
- check-in and occupancy
- programs, sessions, registrations, and attendance
- waivers and signed waiver records
- POS, receipts, and purchase history
- communications hub
- billing and recurring membership foundation
- rentals and reservations
- digital membership cards
- integrations and API foundation
- platform admin / organization provisioning

## Integration Readiness

Cairn already includes internal seams for future replacement or extension:

- payments: `lib/payments/provider.ts`
- billing providers: `lib/billing/providers.ts`
- communications providers: `lib/communications/providers.ts`
- integration providers: `lib/integrations/providers.ts`
- versioned API foundation: `/api/v1`
- webhook generation: `lib/integrations/webhooks.ts`

## Related Documentation
- [Local Development](./local-development.md)
- [Testing](./testing.md)
- [Organizations & Provisioning](./organizations.md)
- [Routes & Portals](../reference/routes-and-portals.md)
