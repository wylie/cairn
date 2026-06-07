# Organizations & Provisioning

## Overview

Cairn supports multiple organizations (facilities). Each organization gets isolated staff, customer, and public experiences.

## Route Model
- public facility: `/f/:orgSlug`
- customer portal: `/p/:orgSlug/*`
- staff portal: `/o/:orgSlug/*`
- platform admin: `/admin/*`

## Provisioning

Platform admins can provision organizations from `/admin/organizations`.

The current wizard creates:
- organization record
- slug
- facility type
- primary location
- owner account metadata
- starter branding
- starter products
- starter waivers
- starter reports/widgets
- generated route set for staff, customer, and public experiences

## Templates
Current provisioning templates include:
- YMCA
- Climbing Gym
- Camp
- Rec Center
- Outdoor Center

Template metadata lives in `lib/platform-admin/registry.ts`.

## Demo Facilities
Current seeded demo organizations:
- `summit` — Summit Rec Collective
- `riverbend` — Riverbend Recreation Collective

Provisioned demo metadata supports:
- demo-only designation
- read-only designation
- resettable demos

## Isolation Rules
Organization isolation is a core assumption:
- staff portals are org-scoped
- customer portals are org-scoped
- reports are org-scoped
- searches are org-scoped
- public facility pages resolve branding and data by `orgSlug`

## Related Documentation
- [System Architecture](./system-architecture.md)
- [Page Access Matrix](../reference/page-access-matrix.md)
- [Facility Onboarding](../facility/onboarding.md)
