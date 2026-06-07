# Architecture

## Overview
Cairn is a responsive Next.js App Router application organized around multi-tenant facility operations.

## Experience Layers
- global marketing and platform admin
- facility public layer
- customer portal layer
- staff portal layer

## Routing Model
- `/` global marketing site
- `/f/:orgSlug` facility landing pages
- `/p/:orgSlug/*` customer-facing public and authenticated flows
- `/o/:orgSlug/*` staff operations
- `/admin/*` platform administration outside organization scope

## State Management Decisions
Current implementation is mock-first and local-state driven.

Primary state systems:
- `lib/state/customer-state.tsx` for customers, households, memberships, check-ins, registrations, waivers, alerts, communications, receipts, billing, rentals, and cards
- `lib/state/workstation-state.tsx` for active staff context and permissions
- `lib/state/settings-state.tsx` for organization formatting, branding, and facility settings
- `lib/state/platform-admin-state.tsx` for platform provisioning concerns

This preserves demoability while keeping future service boundaries clear.

## Shared Systems
- avatar components for customers, staff, and shared fallbacks
- date and time formatting utilities driven by organization settings
- context-aware back navigation
- shared search and autocomplete patterns
- shared layout containers for portal and app-shell consistency

## Implemented Domains
- customers and customer profiles
- households
- memberships and billing foundation
- check-in and occupancy
- programs, sessions, registrations, attendance, and waitlists
- waivers and signed records
- POS, products, purchases, and receipts
- communications and notifications
- alerts and task center
- rentals and reservations
- digital membership cards
- integrations and API foundation
- platform administration and organization provisioning

## Related Documentation
- [Routing](./routing.md)
- [Permissions](./permissions.md)
- [Demo Data](./demo-data.md)
